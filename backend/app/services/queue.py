from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from ..models import QueueEntry, Appointment

def refresh_positions(db: Session, doctor_id: int):
    rows = db.scalars(select(QueueEntry).where(QueueEntry.doctor_id == doctor_id, QueueEntry.status.in_(['waiting','called'])).order_by(QueueEntry.checked_in_time, QueueEntry.id)).all()
    for i, row in enumerate(rows, 1): row.queue_position = i
    db.flush()

def create_queue_entry(db: Session, appointment: Appointment) -> QueueEntry:
    existing = db.scalar(select(QueueEntry).where(QueueEntry.appointment_id == appointment.id))
    if existing: return existing
    count = db.scalar(select(func.count()).select_from(QueueEntry).where(QueueEntry.doctor_id == appointment.doctor_id, QueueEntry.status.in_(['waiting','called']))) or 0
    entry = QueueEntry(appointment_id=appointment.id, patient_id=appointment.patient_id, doctor_id=appointment.doctor_id, token_no=appointment.token_no, queue_position=count+1, status='waiting', checked_in_time=datetime.utcnow())
    db.add(entry); refresh_positions(db, appointment.doctor_id); return entry

def estimated_wait(db: Session, doctor_id: int, queue_position: int, avg_minutes: int = 12) -> int:
    ahead=max(queue_position-1,0); active=db.scalar(select(func.count()).select_from(QueueEntry).where(QueueEntry.doctor_id==doctor_id,QueueEntry.status=='called')) or 0
    return max(0,(ahead+active)*avg_minutes)
