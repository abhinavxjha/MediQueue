from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import require_roles
from ..models import User, PatientProfile
from ..schemas import PatientProfileIn, PatientProfileOut

router = APIRouter(prefix='/api/patient', tags=['Patient Profile'])


def _to_out(user: User, profile: PatientProfile | None) -> PatientProfileOut:
    dob = profile.date_of_birth if profile else None
    sex = profile.sex if profile else None
    data = {
        'full_name': user.name,
        'phone': user.phone,
        'date_of_birth': dob,
        'sex': sex,
        'blood_group': profile.blood_group if profile else None,
        'address': profile.address if profile else None,
        'city': profile.city if profile else None,
        'emergency_contact_name': profile.emergency_contact_name if profile else None,
        'emergency_contact_phone': profile.emergency_contact_phone if profile else None,
    }
    data['profile_complete'] = bool(dob and sex and user.phone)
    return PatientProfileOut(**data)


def _save(payload: PatientProfileIn, user: User, db: Session) -> PatientProfileOut:
    user.name = payload.full_name
    user.phone = payload.phone
    profile = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    if not profile:
        profile = PatientProfile(user_id=user.id)
        db.add(profile)
    profile.date_of_birth = payload.date_of_birth
    profile.sex = payload.sex.value
    profile.blood_group = payload.blood_group.value if payload.blood_group else None
    profile.address = payload.address
    profile.city = payload.city
    profile.emergency_contact_name = payload.emergency_contact_name
    profile.emergency_contact_phone = payload.emergency_contact_phone
    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    db.refresh(profile)
    return _to_out(user, profile)


@router.get('/profile', response_model=PatientProfileOut)
def get_profile(user: User = Depends(require_roles('patient', 'doctor', 'admin')), db: Session = Depends(get_db)):
    profile = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    return _to_out(user, profile)


@router.post('/profile', response_model=PatientProfileOut)
def create_or_update_profile(payload: PatientProfileIn, user: User = Depends(require_roles('patient', 'doctor', 'admin')), db: Session = Depends(get_db)):
    return _save(payload, user, db)


@router.put('/profile', response_model=PatientProfileOut)
def update_profile(payload: PatientProfileIn, user: User = Depends(require_roles('patient', 'doctor', 'admin')), db: Session = Depends(get_db)):
    return _save(payload, user, db)
