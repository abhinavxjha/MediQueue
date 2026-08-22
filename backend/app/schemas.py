import re
from datetime import date, time
from enum import Enum
from pydantic import BaseModel, EmailStr, Field, field_validator

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

PHONE_RE = re.compile(r'^[0-9+\-\s]{7,15}$')

class SexEnum(str, Enum):
    female = 'female'
    male = 'male'
    other = 'other'
    prefer_not_to_say = 'prefer_not_to_say'

class BloodGroupEnum(str, Enum):
    a_pos = 'A+'
    a_neg = 'A-'
    b_pos = 'B+'
    b_neg = 'B-'
    ab_pos = 'AB+'
    ab_neg = 'AB-'
    o_pos = 'O+'
    o_neg = 'O-'
    unknown = 'Unknown'

class PatientProfileIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    date_of_birth: date
    sex: SexEnum
    blood_group: BloodGroupEnum | None = None
    phone: str = Field(min_length=7, max_length=20)
    address: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=80)
    emergency_contact_name: str | None = Field(default=None, max_length=120)
    emergency_contact_phone: str | None = Field(default=None, max_length=30)

    @field_validator('date_of_birth')
    @classmethod
    def dob_not_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError('Date of birth cannot be in the future')
        return v

    @field_validator('phone')
    @classmethod
    def phone_valid(cls, v: str) -> str:
        if not PHONE_RE.match(v.strip()):
            raise ValueError('Enter a valid phone number')
        return v.strip()

    @field_validator('emergency_contact_phone')
    @classmethod
    def emergency_phone_valid(cls, v: str | None) -> str | None:
        if v and not PHONE_RE.match(v.strip()):
            raise ValueError('Enter a valid emergency contact phone number')
        return v.strip() if v else v

class PatientProfileOut(BaseModel):
    full_name: str
    date_of_birth: date | None = None
    sex: str | None = None
    blood_group: str | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    profile_complete: bool = False

    model_config = {'from_attributes': True}
