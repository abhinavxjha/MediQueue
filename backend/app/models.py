from datetime import datetime, date, time
from sqlalchemy import String, Integer, Boolean, DateTime, Date, Time, ForeignKey, Text, Float, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

class User(Base):
    __tablename__ = 'users'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default='patient')
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Hospital(Base):
    __tablename__ = 'hospitals'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180))
    address: Mapped[str] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(80))
    phone: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(180))

class Department(Base):
    __tablename__ = 'departments'
    id: Mapped[int] = mapped_column(primary_key=True)
    hospital_id: Mapped[int] = mapped_column(ForeignKey('hospitals.id'))
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)

class Doctor(Base):
    __tablename__ = 'doctors'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), unique=True)
    hospital_id: Mapped[int] = mapped_column(ForeignKey('hospitals.id'))
    department_id: Mapped[int] = mapped_column(ForeignKey('departments.id'))
    specialization: Mapped[str] = mapped_column(String(120))
    consultation_fee: Mapped[float] = mapped_column(Float, default=500)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)

class Slot(Base):
    __tablename__ = 'slots'
    id: Mapped[int] = mapped_column(primary_key=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey('doctors.id'))
    date: Mapped[date] = mapped_column(Date)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    max_patients: Mapped[int] = mapped_column(Integer, default=10)
    booked_count: Mapped[int] = mapped_column(Integer, default=0)
    __table_args__ = (UniqueConstraint('doctor_id','date','start_time', name='uq_doctor_slot'),)

class Appointment(Base):
    __tablename__ = 'appointments'
    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    doctor_id: Mapped[int] = mapped_column(ForeignKey('doctors.id'))
    slot_id: Mapped[int] = mapped_column(ForeignKey('slots.id'))
    appointment_date: Mapped[date] = mapped_column(Date)
    appointment_time: Mapped[time] = mapped_column(Time)
    token_no: Mapped[str | None] = mapped_column(String(30), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default='booked')
    symptoms: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class QueueEntry(Base):
    __tablename__ = 'queue'
    id: Mapped[int] = mapped_column(primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey('appointments.id'), unique=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    doctor_id: Mapped[int] = mapped_column(ForeignKey('doctors.id'))
    token_no: Mapped[str] = mapped_column(String(30), index=True)
    queue_position: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(30), default='waiting')
    checked_in_time: Mapped[datetime | None] = mapped_column(DateTime)
    called_time: Mapped[datetime | None] = mapped_column(DateTime)
    completed_time: Mapped[datetime | None] = mapped_column(DateTime)

class ESlip(Base):
    __tablename__ = 'e_slips'
    id: Mapped[int] = mapped_column(primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey('appointments.id'), unique=True)
    qr_payload: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Consultation(Base):
    __tablename__ = 'consultations'
    id: Mapped[int] = mapped_column(primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey('appointments.id'), unique=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey('doctors.id'))
    notes: Mapped[str | None] = mapped_column(Text)
    diagnosis: Mapped[str | None] = mapped_column(Text)
    prescription: Mapped[str | None] = mapped_column(Text)
    consultation_datetime: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    followup_date: Mapped[date | None] = mapped_column(Date)

class Notification(Base):
    __tablename__ = 'notifications'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    type: Mapped[str] = mapped_column(String(50))
    message: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Payment(Base):
    __tablename__ = 'payments'
    id: Mapped[int] = mapped_column(primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey('appointments.id'))
    amount: Mapped[float] = mapped_column(Float)
    payment_mode: Mapped[str] = mapped_column(String(30), default='cash')
    payment_status: Mapped[str] = mapped_column(String(30), default='pending')
    payment_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Feedback(Base):
    __tablename__ = 'feedback'
    id: Mapped[int] = mapped_column(primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey('appointments.id'))
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey('users.id'))
    action: Mapped[str] = mapped_column(String(100))
    entity: Mapped[str] = mapped_column(String(100))
    entity_id: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
