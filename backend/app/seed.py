from datetime import date,time,timedelta
from sqlalchemy import select
from .database import Base,engine,SessionLocal
from .models import User,Hospital,Department,Doctor,Slot
from .auth import hash_password
Base.metadata.create_all(bind=engine); db=SessionLocal()
try:
    if db.scalar(select(User).where(User.email=='admin@mediqueue.local')): print('Demo data already exists.')
    else:
        h=Hospital(name='City Care Hospital',address='Main Hospital Road',city='Solan',phone='+91 98765 43210',email='care@cityhospital.local'); db.add(h); db.flush(); deps=[]
        for name in ['Dermatology','Cardiology','General Medicine','Orthopedics']: d=Department(hospital_id=h.id,name=name,description=f'{name} OPD'); db.add(d); deps.append(d)
        db.flush()
        for role,email,pwd,name in [('admin','admin@mediqueue.local','Admin@123','MediQueue Admin'),('patient','patient@mediqueue.local','Patient@123','Yashika Gupta'),('doctor','doctor@mediqueue.local','Doctor@123','Dr. Angel')]: db.add(User(name=name,email=email,password_hash=hash_password(pwd),role=role))
        db.flush(); du=db.scalar(select(User).where(User.email=='doctor@mediqueue.local')); doc=Doctor(user_id=du.id,hospital_id=h.id,department_id=deps[0].id,specialization='Dermatologist',consultation_fee=600,is_available=True); db.add(doc); db.flush(); today=date.today()
        for off in range(4):
            for hh in [10,11,12,14,15,16]: db.add(Slot(doctor_id=doc.id,date=today+timedelta(days=off),start_time=time(hh,0),end_time=time(hh,30),max_patients=10,booked_count=0))
        db.commit(); print('Seeded MediQueue demo data.')
finally: db.close()
