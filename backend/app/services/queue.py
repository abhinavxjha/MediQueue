from datetime import datetime, date
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from ..models import QueueEntry, Appointment

def refresh_positions(db: Session, doctor_id: int):
    rows = db.scalars(
        select(QueueEntry)
        .where(QueueEntry.doctor_id == doctor_id, QueueEntry.status.in_(['waiting', 'called']))
        .order_by(QueueEntry.checked_in_time, QueueEntry.id)
    ).all()
    for i, row in enumerate(rows, 1):
        row.queue_position = i
    db.flush()

def create_queue_entry(db: Session, appointment: Appointment) -> QueueEntry:
    existing = db.scalar(select(QueueEntry).where(QueueEntry.appointment_id == appointment.id))
    if existing:
        return existing
    count = db.scalar(
        select(func.count())
        .select_from(QueueEntry)
        .where(QueueEntry.doctor_id == appointment.doctor_id, QueueEntry.status.in_(['waiting', 'called']))
    ) or 0
    entry = QueueEntry(
        appointment_id=appointment.id,
        patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id,
        token_no=appointment.token_no,
        queue_position=count + 1,
        status='waiting',
        checked_in_time=datetime.utcnow()
    )
    db.add(entry)
    refresh_positions(db, appointment.doctor_id)
    return entry

def get_average_consultation_time(db: Session, doctor_id: int) -> float:
    completed = db.scalars(
        select(QueueEntry)
        .where(
            QueueEntry.doctor_id == doctor_id,
            QueueEntry.status == 'completed',
            QueueEntry.called_time.is_not(None),
            QueueEntry.completed_time.is_not(None)
        )
    ).all()
    
    durations = []
    for entry in completed:
        if entry.completed_time and entry.called_time and entry.completed_time > entry.called_time:
            mins = (entry.completed_time - entry.called_time).total_seconds() / 60.0
            if 0.5 <= mins <= 120:
                durations.append(mins)
                
    if durations:
        return round(sum(durations) / len(durations), 1)
    return 10.0

def get_wait_prediction_details(db: Session, doctor_id: int, queue_position: int) -> dict:
    avg_mins = get_average_consultation_time(db, doctor_id)
    ahead = max(queue_position - 1, 0)
    
    active_entry = db.scalar(
        select(QueueEntry)
        .where(QueueEntry.doctor_id == doctor_id, QueueEntry.status == 'called')
    )
    
    active_remaining = 0.0
    if active_entry and active_entry.called_time:
        elapsed = (datetime.utcnow() - active_entry.called_time).total_seconds() / 60.0
        active_remaining = max(1.0, round(avg_mins - elapsed, 1))
    elif active_entry:
        active_remaining = avg_mins

    total_est = (ahead * avg_mins) + active_remaining
    predicted_mins = max(0, int(round(total_est)))
    
    completed_count = db.scalar(
        select(func.count())
        .select_from(QueueEntry)
        .where(
            QueueEntry.doctor_id == doctor_id,
            QueueEntry.status == 'completed',
            QueueEntry.called_time.is_not(None),
            QueueEntry.completed_time.is_not(None)
        )
    ) or 0
    
    return {
        "predicted_wait_minutes": predicted_mins,
        "avg_consultation_time": avg_mins,
        "patients_ahead": ahead,
        "ongoing_remaining_minutes": active_remaining if active_entry else 0,
        "samples_count": completed_count
    }

def estimated_wait(db: Session, doctor_id: int, queue_position: int) -> int:
    return get_wait_prediction_details(db, doctor_id, queue_position)["predicted_wait_minutes"]

