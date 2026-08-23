from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Doctor, Hospital, Department, Appointment, QueueEntry, Slot, Consultation
from ..schemas import ConsultationIn, SlotIn, DoctorProfileIn, DoctorProfileOut
from ..auth import require_roles
from ..services.queue import refresh_positions, create_queue_entry

router = APIRouter(prefix='/api/doctor', tags=['Doctor'])
doc_dep = require_roles('doctor')

def get_doctor(user, db):
    d = db.scalar(select(Doctor).where(Doctor.user_id == user.id))
    if not d:
        d = Doctor(user_id=user.id, hospital_id=1, department_id=1, specialization='General Medicine', consultation_fee=500, is_available=True)
        db.add(d); db.commit(); db.refresh(d)
    return d

@router.get('/profile')
def get_doctor_profile(user=Depends(doc_dep), db: Session = Depends(get_db)):
    d = get_doctor(user, db)
    h = db.get(Hospital, d.hospital_id) if d.hospital_id else None
    dep = db.get(Department, d.department_id) if d.department_id else None
    profile_complete = bool(d.specialization and d.hospital_id and d.department_id and d.consultation_fee and user.phone)
    return {
        'user_id': user.id,
        'doctor_id': d.id,
        'name': user.name,
        'email': user.email,
        'phone': user.phone or "",
        'hospital_id': d.hospital_id,
        'hospital_name': h.name if h else "—",
        'department_id': d.department_id,
        'department_name': dep.name if dep else "—",
        'specialization': d.specialization or "General Medicine",
        'consultation_fee': d.consultation_fee or 500.0,
        'is_available': d.is_available,
        'qualification': getattr(d, 'qualification', None) or "MBBS, MD",
        'experience_years': getattr(d, 'experience_years', 5) or 5,
        'bio': getattr(d, 'bio', None) or "",
        'profile_complete': profile_complete
    }

@router.post('/profile')
@router.put('/profile')
def update_doctor_profile(payload: DoctorProfileIn, user=Depends(doc_dep), db: Session = Depends(get_db)):
    d = get_doctor(user, db)
    user.name = payload.name
    if payload.phone is not None:
        user.phone = payload.phone
    d.hospital_id = payload.hospital_id
    d.department_id = payload.department_id
    d.specialization = payload.specialization
    d.consultation_fee = payload.consultation_fee
    d.qualification = payload.qualification
    d.experience_years = payload.experience_years
    d.bio = payload.bio
    db.commit()
    return get_doctor_profile(user, db)

@router.get('/dashboard')
def dashboard(user=Depends(doc_dep), db: Session = Depends(get_db)):
    d = get_doctor(user, db)
    refresh_positions(db, d.id)
    
    # Today's appointments for this doctor
    apps = db.scalars(
        select(Appointment)
        .where(Appointment.doctor_id == d.id, Appointment.appointment_date == date.today())
        .order_by(Appointment.appointment_time)
    ).all()
    
    # Queue entries (waiting, called/ongoing)
    q = db.scalars(
        select(QueueEntry)
        .where(QueueEntry.doctor_id == d.id, QueueEntry.status.in_(['waiting', 'called']))
        .order_by(QueueEntry.queue_position)
    ).all()
    
    queue_list = []
    for x in q:
        pat = db.get(User, x.patient_id)
        appt = db.get(Appointment, x.appointment_id)
        queue_list.append({
            'id': x.id,
            'appointment_id': x.appointment_id,
            'token': x.token_no,
            'position': x.queue_position,
            'status': x.status,
            'patient_id': x.patient_id,
            'patient_name': pat.name if pat else f"Patient #{x.patient_id}",
            'patient_phone': pat.phone if pat else "—",
            'symptoms': appt.symptoms if appt else "Not provided",
            'date': str(appt.appointment_date) if appt else str(date.today()),
            'time': appt.appointment_time.strftime('%H:%M') if appt else "—"
        })
        
    app_list = []
    for a in apps:
        pat = db.get(User, a.patient_id)
        q_entry = db.scalar(select(QueueEntry).where(QueueEntry.appointment_id == a.id))
        app_list.append({
            'id': a.id,
            'queue_id': q_entry.id if q_entry else None,
            'date': str(a.appointment_date),
            'time': a.appointment_time.strftime('%H:%M'),
            'token': a.token_no,
            'status': a.status,
            'patient_id': a.patient_id,
            'patient_name': pat.name if pat else f"Patient #{a.patient_id}",
            'patient_phone': pat.phone if pat else "—",
            'symptoms': a.symptoms
        })

    return {
        'doctor': {
            'id': d.id,
            'name': user.name,
            'specialization': d.specialization,
            'is_available': d.is_available
        },
        'stats': {
            'booked': len(apps),
            'checked_in': sum(a.status in ['checked_in', 'called', 'ongoing'] for a in apps),
            'completed': sum(a.status == 'completed' for a in apps),
            'waiting': sum(x.status == 'waiting' for x in q)
        },
        'queue': queue_list,
        'today_appointments': app_list
    }

@router.post('/availability')
def toggle_availability(is_available: bool = Query(...), user=Depends(doc_dep), db: Session = Depends(get_db)):
    d = get_doctor(user, db)
    d.is_available = is_available
    db.commit()
    return {
        'message': f'Status updated to {"Free / Available" if is_available else "Busy"}',
        'is_available': d.is_available
    }

@router.post('/queue/next')
def next_patient(user=Depends(doc_dep), db: Session = Depends(get_db)):
    d = get_doctor(user, db)
    refresh_positions(db, d.id)
    q = db.scalar(select(QueueEntry).where(QueueEntry.doctor_id == d.id, QueueEntry.status == 'waiting').order_by(QueueEntry.queue_position))
    if not q:
        raise HTTPException(404, 'No waiting patient in queue')
    q.status = 'called'
    q.called_time = datetime.utcnow()
    appt = db.get(Appointment, q.appointment_id)
    if appt:
        appt.status = 'called'
    db.commit()
    return {'message': f'Patient {q.token_no} marked as ONGOING', 'token': q.token_no, 'patient_id': q.patient_id}

@router.post('/queue/{queue_id}/ongoing')
def mark_ongoing_patient(queue_id: int, user=Depends(doc_dep), db: Session = Depends(get_db)):
    d = get_doctor(user, db)
    q = db.get(QueueEntry, queue_id)
    if not q or q.doctor_id != d.id:
        q = db.scalar(select(QueueEntry).where(QueueEntry.appointment_id == queue_id))
    if not q:
        appt = db.get(Appointment, queue_id)
        if appt and appt.doctor_id == d.id:
            q = create_queue_entry(db, appt)
    if not q:
        raise HTTPException(404, 'Queue entry / appointment not found')
        
    q.status = 'called'
    q.called_time = datetime.utcnow()
    appt = db.get(Appointment, q.appointment_id)
    if appt:
        appt.status = 'called'
    refresh_positions(db, d.id)
    db.commit()
    return {'message': f'Patient {q.token_no} marked as ONGOING', 'token': q.token_no}

@router.post('/queue/{queue_id}/complete')
def complete(queue_id: int, data: ConsultationIn, user=Depends(doc_dep), db: Session = Depends(get_db)):
    d = get_doctor(user, db)
    q = db.get(QueueEntry, queue_id)
    if not q or q.doctor_id != d.id:
        q = db.scalar(select(QueueEntry).where(QueueEntry.appointment_id == queue_id))
    if not q:
        raise HTTPException(404, 'Queue entry not found')
        
    now = datetime.utcnow()
    if not q.called_time:
        q.called_time = now
        
    q.status = 'completed'
    q.completed_time = now
    
    a = db.get(Appointment, q.appointment_id)
    if a:
        a.status = 'completed'
        
    db.add(Consultation(
        appointment_id=a.id if a else q.appointment_id,
        doctor_id=d.id,
        notes=data.notes or "Consultation completed.",
        diagnosis=data.diagnosis or "Routine OPD checkup.",
        prescription=data.prescription or "Follow doctor advice.",
        followup_date=data.followup_date
    ))
    refresh_positions(db, d.id)
    db.commit()
    return {'message': 'Consultation completed successfully'}

@router.post('/slots')
def add_slot(data: SlotIn, user=Depends(doc_dep), db: Session = Depends(get_db)):
    d = get_doctor(user, db)
    existing = db.scalar(select(Slot).where(Slot.doctor_id == d.id, Slot.date == data.date, Slot.start_time == data.start_time))
    if existing:
        raise HTTPException(409, 'Slot already exists')
    s = Slot(doctor_id=d.id, **data.model_dump())
    db.add(s); db.commit(); db.refresh(s)
    return {'id': s.id, 'message': 'Slot created'}

@router.get('/appointments')
def appointments(user=Depends(doc_dep), db: Session = Depends(get_db)):
    d = get_doctor(user, db)
    rows = db.scalars(
        select(Appointment)
        .where(Appointment.doctor_id == d.id)
        .order_by(Appointment.appointment_date.desc(), Appointment.appointment_time)
    ).all()
    
    out = []
    for a in rows:
        pat = db.get(User, a.patient_id)
        q_entry = db.scalar(select(QueueEntry).where(QueueEntry.appointment_id == a.id))
        out.append({
            'id': a.id,
            'queue_id': q_entry.id if q_entry else None,
            'date': str(a.appointment_date),
            'time': a.appointment_time.strftime('%H:%M'),
            'token': a.token_no,
            'status': a.status,
            'patient_id': a.patient_id,
            'patient_name': pat.name if pat else f"Patient #{a.patient_id}",
            'patient_phone': pat.phone if pat else "—",
            'symptoms': a.symptoms
        })
    return out
