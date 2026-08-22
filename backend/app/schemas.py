from datetime import date, time
from pydantic import BaseModel, EmailStr, Field

class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = None
    password: str = Field(min_length=8)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class AppointmentIn(BaseModel):
    doctor_id: int
    slot_id: int
    symptoms: str | None = Field(default=None, max_length=2000)

class CheckInIn(BaseModel):
    appointment_id: int

class ConsultationIn(BaseModel):
    notes: str | None = None
    diagnosis: str | None = None
    prescription: str | None = None
    followup_date: date | None = None

class SlotIn(BaseModel):
    date: date
    start_time: time
    end_time: time
    max_patients: int = Field(default=10, ge=1, le=100)

class FeedbackIn(BaseModel):
    appointment_id: int
    rating: int = Field(ge=1, le=5)
    comment: str | None = None
