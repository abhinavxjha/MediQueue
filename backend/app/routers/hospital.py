from datetime import datetime, date
from typing import Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Doctor, Department, Hospital, Appointment, QueueEntry, Consultation, Notification
from ..auth import get_current_user, require_roles
from ..services.queue import refresh_positions, get_average_consultation_time

router = APIRouter(prefix="/api/hospital", tags=["hospital"])

# RBAC Dependency allowing hospital, admin, or doctor staff
hospital_staff_dep = require_roles(["hospital", "admin", "doctor"])

class ScheduleUpdatePayload(BaseModel):
    is_available: bool
    weekly_schedule: Dict[str, bool]

@router.get("/overview")
def get_hospital_overview(
    db: Session = Depends(get_db),
    user: User = Depends(hospital_staff_dep)
):
    total_doctors = db.scalar(select(func.count()).select_from(Doctor)) or 0
    available_doctors = db.scalar(select(func.count()).select_from(Doctor).where(Doctor.is_available == True)) or 0
    
    waiting_count = db.scalar(select(func.count()).select_from(QueueEntry).where(QueueEntry.status == 'waiting')) or 0
    ongoing_count = db.scalar(select(func.count()).select_from(QueueEntry).where(QueueEntry.status == 'called')) or 0
    completed_count = db.scalar(select(func.count()).select_from(QueueEntry).where(QueueEntry.status == 'completed')) or 0
    
    # Calculate overall hospital average consultation duration today
    completed_entries = db.scalars(
        select(QueueEntry)
        .where(
            QueueEntry.status == 'completed',
            QueueEntry.called_time.is_not(None),
            QueueEntry.completed_time.is_not(None)
        )
    ).all()
    
    durations = []
    for e in completed_entries:
        if e.completed_time and e.called_time and e.completed_time > e.called_time:
            mins = (e.completed_time - e.called_time).total_seconds() / 60.0
            if 0.5 <= mins <= 120:
                durations.append(mins)
                
    avg_duration = round(sum(durations) / len(durations), 1) if durations else 10.0

    return {
        "doctors": {
            "total": total_doctors,
            "available": available_doctors
        },
        "queue_stats": {
            "waiting": waiting_count,
            "ongoing": ongoing_count,
            "completed": completed_count,
            "avg_duration_minutes": avg_duration
        }
    }

@router.get("/queue")
def get_hospital_queue(
    doctor_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(hospital_staff_dep)
):
    query = (
        select(QueueEntry, Appointment, User, Doctor, Department)
        .join(Appointment, QueueEntry.appointment_id == Appointment.id)
        .join(User, QueueEntry.patient_id == User.id)
        .join(Doctor, QueueEntry.doctor_id == Doctor.id)
        .join(Department, Doctor.department_id == Department.id)
        .order_by(QueueEntry.status == 'called', QueueEntry.queue_position, QueueEntry.id)
    )
    
    if doctor_id:
        query = query.where(QueueEntry.doctor_id == doctor_id)
    if status:
        query = query.where(QueueEntry.status == status)

    results = db.execute(query).all()
    output = []
    
    now = datetime.utcnow()
    
    for qe, appt, pat, doc, dept in results:
        duration_sec = None
        elapsed_ongoing_sec = None
        
        if qe.called_time and qe.completed_time and qe.completed_time > qe.called_time:
            duration_sec = int((qe.completed_time - qe.called_time).total_seconds())
        elif qe.called_time and qe.status == 'called':
            elapsed_ongoing_sec = int((now - qe.called_time).total_seconds())

        doc_user = db.scalar(select(User).where(User.id == doc.user_id))
        doc_name = doc_user.name if doc_user else f"Doctor #{doc.id}"

        output.append({
            "queue_id": qe.id,
            "appointment_id": appt.id,
            "token_no": qe.token_no,
            "queue_position": qe.queue_position,
            "status": qe.status,
            "patient_name": pat.name,
            "patient_email": pat.email,
            "patient_phone": pat.phone,
            "symptoms": appt.symptoms,
            "doctor_id": doc.id,
            "doctor_name": doc_name,
            "department_name": dept.name,
            "checked_in_time": qe.checked_in_time.strftime("%H:%M:%S") if qe.checked_in_time else None,
            "called_time": qe.called_time.strftime("%H:%M:%S") if qe.called_time else None,
            "completed_time": qe.completed_time.strftime("%H:%M:%S") if qe.completed_time else None,
            "duration_seconds": duration_sec,
            "elapsed_ongoing_seconds": elapsed_ongoing_sec
        })

    return output

@router.post("/queue/{queue_id}/ongoing")
def mark_queue_ongoing(
    queue_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(hospital_staff_dep)
):
    entry = db.scalar(select(QueueEntry).where(QueueEntry.id == queue_id))
    if not entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")

    # Mark as called/ongoing and record timestamp
    entry.status = 'called'
    entry.called_time = datetime.utcnow()
    
    # Also update appointment status
    appt = db.scalar(select(Appointment).where(Appointment.id == entry.appointment_id))
    if appt:
        appt.status = 'called'

    refresh_positions(db, entry.doctor_id)
    
    # Notify patient
    db.add(Notification(
        user_id=entry.patient_id,
        type="queue_update",
        message=f"Ticket {entry.token_no}: Your turn has arrived! Please enter the consultation room now."
    ))
    db.commit()

    return {
        "message": "Appointment marked as ONGOING",
        "queue_id": entry.id,
        "token_no": entry.token_no,
        "called_time": entry.called_time.isoformat()
    }

@router.post("/queue/{queue_id}/complete")
def mark_queue_completed(
    queue_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(hospital_staff_dep)
):
    entry = db.scalar(select(QueueEntry).where(QueueEntry.id == queue_id))
    if not entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")

    now = datetime.utcnow()
    if not entry.called_time:
        entry.called_time = now

    entry.status = 'completed'
    entry.completed_time = now
    
    appt = db.scalar(select(Appointment).where(Appointment.id == entry.appointment_id))
    if appt:
        appt.status = 'completed'

    # Auto-create draft consultation if not existing
    existing_consult = db.scalar(select(Consultation).where(Consultation.appointment_id == entry.appointment_id))
    if not existing_consult and appt:
        db.add(Consultation(
            appointment_id=appt.id,
            doctor_id=entry.doctor_id,
            notes="Consultation completed at hospital desk.",
            diagnosis="Routine OPD checkup completed.",
            prescription="Follow doctor instructions."
        ))

    refresh_positions(db, entry.doctor_id)

    db.add(Notification(
        user_id=entry.patient_id,
        type="queue_update",
        message=f"Ticket {entry.token_no}: Consultation completed. Thank you!"
    ))
    db.commit()

    duration_min = round((entry.completed_time - entry.called_time).total_seconds() / 60.0, 1)

    return {
        "message": "Appointment marked as COMPLETED",
        "queue_id": entry.id,
        "token_no": entry.token_no,
        "completed_time": entry.completed_time.isoformat(),
        "duration_minutes": duration_min
    }

@router.post("/queue/{queue_id}/cancel")
def mark_queue_cancelled(
    queue_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(hospital_staff_dep)
):
    entry = db.scalar(select(QueueEntry).where(QueueEntry.id == queue_id))
    if not entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")

    entry.status = 'cancelled'
    appt = db.scalar(select(Appointment).where(Appointment.id == entry.appointment_id))
    if appt:
        appt.status = 'cancelled'

    refresh_positions(db, entry.doctor_id)
    db.commit()

    return {"message": "Queue entry cancelled", "queue_id": queue_id}

@router.get("/doctors")
def get_hospital_doctors(
    db: Session = Depends(get_db),
    user: User = Depends(hospital_staff_dep)
):
    results = db.execute(
        select(Doctor, User, Department)
        .join(User, Doctor.user_id == User.id)
        .join(Department, Doctor.department_id == Department.id)
    ).all()

    default_sched = {
        "monday": True,
        "tuesday": True,
        "wednesday": True,
        "thursday": True,
        "friday": True,
        "saturday": True,
        "sunday": False
    }

    doctors_list = []
    for doc, doc_user, dept in results:
        sched = doc.weekly_schedule or default_sched
        avg_mins = get_average_consultation_time(db, doc.id)
        
        doctors_list.append({
            "id": doc.id,
            "name": doc_user.name,
            "email": doc_user.email,
            "specialization": doc.specialization,
            "department_id": dept.id,
            "department_name": dept.name,
            "consultation_fee": doc.consultation_fee,
            "is_available": doc.is_available,
            "weekly_schedule": sched,
            "avg_consultation_time_min": avg_mins
        })

    return doctors_list

@router.post("/doctors/{doctor_id}/schedule")
def update_doctor_schedule(
    doctor_id: int,
    payload: ScheduleUpdatePayload,
    db: Session = Depends(get_db),
    user: User = Depends(hospital_staff_dep)
):
    doc = db.scalar(select(Doctor).where(Doctor.id == doctor_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")

    doc.is_available = payload.is_available
    doc.weekly_schedule = payload.weekly_schedule
    db.commit()

    return {
        "message": "Doctor schedule and availability updated successfully",
        "doctor_id": doc.id,
        "is_available": doc.is_available,
        "weekly_schedule": doc.weekly_schedule
    }

@router.get("/logs")
def get_patient_time_logs(
    db: Session = Depends(get_db),
    user: User = Depends(hospital_staff_dep)
):
    results = db.execute(
        select(QueueEntry, Appointment, User, Doctor)
        .join(Appointment, QueueEntry.appointment_id == Appointment.id)
        .join(User, QueueEntry.patient_id == User.id)
        .join(Doctor, QueueEntry.doctor_id == Doctor.id)
        .order_by(QueueEntry.id.desc())
    ).all()

    logs = []
    for qe, appt, pat, doc in results:
        doc_user = db.scalar(select(User).where(User.id == doc.user_id))
        doc_name = doc_user.name if doc_user else f"Doctor #{doc.id}"

        total_wait_min = None
        duration_min = None

        if qe.checked_in_time and qe.called_time:
            total_wait_min = round((qe.called_time - qe.checked_in_time).total_seconds() / 60.0, 1)

        if qe.called_time and qe.completed_time:
            duration_min = round((qe.completed_time - qe.called_time).total_seconds() / 60.0, 1)

        logs.append({
            "queue_id": qe.id,
            "token_no": qe.token_no,
            "patient_name": pat.name,
            "doctor_name": doc_name,
            "status": qe.status,
            "checked_in_time": qe.checked_in_time.strftime("%Y-%m-%d %H:%M:%S") if qe.checked_in_time else "—",
            "ongoing_start_time": qe.called_time.strftime("%Y-%m-%d %H:%M:%S") if qe.called_time else "—",
            "completed_end_time": qe.completed_time.strftime("%Y-%m-%d %H:%M:%S") if qe.completed_time else "—",
            "total_wait_minutes": total_wait_min if total_wait_min is not None else "—",
            "consultation_duration_minutes": duration_min if duration_min is not None else "—"
        })

    return logs
