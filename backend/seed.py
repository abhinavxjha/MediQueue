import json
from pathlib import Path
from datetime import date, time, timedelta

from sqlalchemy import select

from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models import Department, Doctor, Hospital, Slot, User

Base.metadata.create_all(bind=engine)

CATALOG_PATH = Path(__file__).resolve().parent.parent / 'data' / 'hospital_catalog.json'


def load_catalog():
    with CATALOG_PATH.open(encoding='utf-8') as catalog_file:
        return json.load(catalog_file)['hospitals']


def get_or_create_user(db, name, email, role='doctor'):
    user = db.scalar(select(User).where(User.email == email))
    if user:
        default_pwd = 'Patient@123' if role == 'patient' else ('Admin@123' if role == 'admin' else ('Hospital@123' if role == 'hospital' else 'Doctor@123'))
        user.password_hash = hash_password(default_pwd)
        db.flush()
        return user
    default_pwd = 'Patient@123' if role == 'patient' else ('Admin@123' if role == 'admin' else ('Hospital@123' if role == 'hospital' else 'Doctor@123'))
    user = User(
        name=name,
        email=email,
        password_hash=hash_password(default_pwd),
        role=role,
    )
    db.add(user)
    db.flush()
    return user


def get_or_create_hospital(db, details):
    hospital = db.scalar(select(Hospital).where(Hospital.email == details['email']))
    if hospital:
        return hospital
    hospital = Hospital(**{key: details[key] for key in ('name', 'address', 'city', 'phone', 'email')})
    db.add(hospital)
    db.flush()
    return hospital


def seed_catalog(db):
    today = date.today()
    for hospital_details in load_catalog():
        hospital = get_or_create_hospital(db, hospital_details)
        for department_details in hospital_details['departments']:
            department_name = department_details['name']
            department = db.scalar(
                select(Department).where(
                    Department.hospital_id == hospital.id,
                    Department.name == department_name,
                )
            )
            if not department:
                department = Department(
                    hospital_id=hospital.id,
                    name=department_name,
                    description=department_details.get('description') or f'{department_name} OPD',
                )
                db.add(department)
                db.flush()
            for doctor_details in department_details['doctors']:
                name = doctor_details['name']
                specialization = doctor_details['specialization']
                fee = doctor_details['fee']
                email = f"{name.lower().replace('dr. ', '').replace(' ', '.')}@querly.com"
                user = get_or_create_user(db, name, email)
                doctor = db.scalar(select(Doctor).where(Doctor.user_id == user.id))
                if not doctor:
                    doctor = Doctor(
                        user_id=user.id,
                        hospital_id=hospital.id,
                        department_id=department.id,
                        specialization=specialization,
                        consultation_fee=fee,
                        is_available=True,
                    )
                    db.add(doctor)
                    db.flush()
                for offset in range(4):
                    for hour in (10, 11, 12, 14, 15, 16):
                        exists = db.scalar(
                            select(Slot).where(
                                Slot.doctor_id == doctor.id,
                                Slot.date == today + timedelta(days=offset),
                                Slot.start_time == time(hour, 0),
                            )
                        )
                        if not exists:
                            db.add(Slot(
                                doctor_id=doctor.id,
                                date=today + timedelta(days=offset),
                                start_time=time(hour, 0),
                                end_time=time(hour, 30),
                                max_patients=10,
                                booked_count=0,
                            ))


db = SessionLocal()
try:
    get_or_create_user(db, 'Querly Admin', 'admin@querly.com', 'admin')
    get_or_create_user(db, 'Yashika Gupta', 'patient@querly.com', 'patient')
    get_or_create_user(db, 'Hospital Desk', 'hospital@querly.com', 'hospital')
    seed_catalog(db)
    db.commit()
    print('Seeded Querly hospital, department, doctor, slot, and hospital desk user catalog.')
finally:
    db.close()
