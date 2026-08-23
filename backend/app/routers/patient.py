from datetime import date
from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy import select,and_
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User,Hospital,Department,Doctor,Slot,Appointment,QueueEntry,ESlip,Notification,Consultation
from ..schemas import AppointmentIn,CheckInIn,FeedbackIn
from ..auth import require_roles
from ..services.queue import create_queue_entry,estimated_wait,refresh_positions
from ..services.slips import qr_data_url
router=APIRouter(prefix='/api/patient',tags=['Patient']); patient_dep=require_roles('patient', 'doctor', 'admin')

# Temporary Feature: demo-only appointment completion after the frontend timer expires.
@router.post('/appointments/{appointment_id}/temporary-complete')
def temporary_complete(appointment_id:int,user=Depends(patient_dep),db:Session=Depends(get_db)):
    appointment=db.get(Appointment,appointment_id)
    if not appointment or appointment.patient_id!=user.id: raise HTTPException(404,'Appointment not found')
    if appointment.status!='completed':
        appointment.status='completed'
        queue_entry=db.scalar(select(QueueEntry).where(QueueEntry.appointment_id==appointment.id))
        if queue_entry: queue_entry.status='completed'
        if not db.scalar(select(Consultation).where(Consultation.appointment_id==appointment.id)):
            db.add(Consultation(appointment_id=appointment.id,doctor_id=appointment.doctor_id,notes='Temporary demo completion. Doctor report is pending.',diagnosis=None,prescription=None))
        db.commit()
    return {'message':'Appointment moved to history','appointment_id':appointment.id,'status':appointment.status}

@router.get('/home')
def home(user=Depends(patient_dep),db:Session=Depends(get_db)):
    apps=db.scalars(select(Appointment).where(Appointment.patient_id==user.id).order_by(Appointment.appointment_date.desc(),Appointment.appointment_time.desc()).limit(100)).all(); out=[]
    for a in apps:
        d=db.get(Doctor,a.doctor_id); du=db.get(User,d.user_id); dep=db.get(Department,d.department_id); h=db.get(Hospital,d.hospital_id); q=db.scalar(select(QueueEntry).where(QueueEntry.appointment_id==a.id))
        consultation=db.scalar(select(Consultation).where(Consultation.appointment_id==a.id))
        out.append({'id':a.id,'date':str(a.appointment_date),'time':a.appointment_time.strftime('%H:%M'),'status':a.status,'token':a.token_no,'symptoms':a.symptoms,'doctor':du.name,'specialization':d.specialization,'department':dep.name,'hospital':h.name,'fee':d.consultation_fee,'queue_position':q.queue_position if q else None,'waiting_minutes':estimated_wait(db,d.id,q.queue_position) if q else None,'consultation':{'notes':consultation.notes,'diagnosis':consultation.diagnosis,'prescription':consultation.prescription,'followup_date':str(consultation.followup_date) if consultation.followup_date else None} if consultation else None})
    return {'patient':{'id':user.id,'name':user.name,'email':user.email},'appointments':out}
@router.get('/hospitals')
def hospitals(db:Session=Depends(get_db)):
    result = []
    for hospital in db.scalars(select(Hospital).order_by(Hospital.name)).all():
        departments = db.scalars(
            select(Department).where(Department.hospital_id == hospital.id).order_by(Department.name)
        ).all()
        result.append({
            'id': hospital.id,
            'name': hospital.name,
            'city': hospital.city,
            'address': hospital.address,
            'phone': hospital.phone,
            'email': hospital.email,
            'departments': [{
                'id': department.id,
                'name': department.name,
                'description': department.description,
                'doctors': [{
                    'id': doctor.id,
                    'name': db.get(User, doctor.user_id).name,
                    'specialization': doctor.specialization,
                    'fee': doctor.consultation_fee,
                    'available': doctor.is_available,
                } for doctor in db.scalars(
                    select(Doctor).where(Doctor.department_id == department.id).order_by(Doctor.id)
                ).all()],
            } for department in departments],
        })
    return result
@router.get('/doctors')
def doctors(hospital_id:int|None=None,department_id:int|None=None,q:str|None=None,db:Session=Depends(get_db)):
    stmt=select(Doctor); stmt=stmt.where(Doctor.hospital_id==hospital_id) if hospital_id else stmt; stmt=stmt.where(Doctor.department_id==department_id) if department_id else stmt; rows=db.scalars(stmt).all(); out=[]
    for d in rows:
        u=db.get(User,d.user_id); dep=db.get(Department,d.department_id); h=db.get(Hospital,d.hospital_id)
        if q and q.lower() not in (u.name+' '+d.specialization+' '+dep.name).lower(): continue
        out.append({'id':d.id,'name':u.name,'specialization':d.specialization,'department':dep.name,'hospital':h.name,'hospital_id':h.id,'department_id':dep.id,'fee':d.consultation_fee,'available':d.is_available})
    return out
@router.get('/slots')
def slots(doctor_id: int, selected_date: date | None = None, db: Session = Depends(get_db)):
    if not selected_date:
        selected_date = date.today()
    rows = db.scalars(
        select(Slot)
        .where(Slot.doctor_id == doctor_id, Slot.date == selected_date)
        .order_by(Slot.start_time)
    ).all()
    if not rows:
        doctor = db.get(Doctor, doctor_id)
        if doctor:
            from datetime import time
            for hour in (9, 10, 11, 12, 14, 15, 16, 17):
                s = Slot(
                    doctor_id=doctor.id,
                    date=selected_date,
                    start_time=time(hour, 0),
                    end_time=time(hour, 30),
                    max_patients=10,
                    booked_count=0,
                )
                db.add(s)
            db.commit()
            rows = db.scalars(
                select(Slot)
                .where(Slot.doctor_id == doctor_id, Slot.date == selected_date)
                .order_by(Slot.start_time)
            ).all()
    return [
        {
            'id': s.id,
            'start_time': s.start_time.strftime('%H:%M'),
            'end_time': s.end_time.strftime('%H:%M'),
            'max_patients': s.max_patients,
            'booked_count': s.booked_count,
            'available': s.booked_count < s.max_patients,
        }
        for s in rows
    ]
@router.post('/appointments')
def book(data:AppointmentIn,user=Depends(patient_dep),db:Session=Depends(get_db)):
    slot=db.get(Slot,data.slot_id); doctor=db.get(Doctor,data.doctor_id)
    if not slot or not doctor or slot.doctor_id!=doctor.id or slot.booked_count>=slot.max_patients: raise HTTPException(400,'Slot is unavailable')
    if db.scalar(select(Appointment).where(and_(Appointment.patient_id==user.id,Appointment.slot_id==slot.id,Appointment.status.not_in(['cancelled'])))): raise HTTPException(409,'You already have an appointment in this slot')
    token=f"{db.get(Department,doctor.department_id).name[:1].upper()}-{slot.booked_count+1:03d}"; a=Appointment(patient_id=user.id,doctor_id=doctor.id,slot_id=slot.id,appointment_date=slot.date,appointment_time=slot.start_time,token_no=token,status='booked',symptoms=data.symptoms); slot.booked_count+=1; db.add(a); db.flush(); db.add(ESlip(appointment_id=a.id,qr_payload=str({'appointment_id':a.id,'patient_id':user.id,'token':token}))); db.add(Notification(user_id=user.id,type='booking',message=f'Appointment booked successfully. Token {token}.')); db.commit(); return {'message':'Appointment booked','appointment_id':a.id,'token':token}
@router.post('/check-in')
def checkin(data:CheckInIn,user=Depends(patient_dep),db:Session=Depends(get_db)):
    a=db.get(Appointment,data.appointment_id)
    if not a or a.patient_id!=user.id: raise HTTPException(404,'Appointment not found')
    if a.status not in ['booked','checked_in']: raise HTTPException(400,'Appointment cannot be checked in')
    a.status='checked_in'; q=create_queue_entry(db,a); db.commit(); return {'message':'Checked in','token':q.token_no,'position':q.queue_position,'waiting_minutes':estimated_wait(db,a.doctor_id,q.queue_position)}
@router.get('/queue/{appointment_id}')
def queue(appointment_id:int,user=Depends(patient_dep),db:Session=Depends(get_db)):
    a=db.get(Appointment,appointment_id)
    if not a or a.patient_id!=user.id: raise HTTPException(404,'Appointment not found')
    q=db.scalar(select(QueueEntry).where(QueueEntry.appointment_id==a.id));
    if not q:return {'status':a.status,'token':a.token_no,'position':None,'waiting_minutes':None,'now_serving':None}
    refresh_positions(db,a.doctor_id); db.commit(); called=db.scalar(select(QueueEntry).where(QueueEntry.doctor_id==a.doctor_id,QueueEntry.status=='called')); return {'status':q.status,'token':q.token_no,'position':q.queue_position,'waiting_minutes':estimated_wait(db,a.doctor_id,q.queue_position),'now_serving':called.token_no if called else None}
@router.get('/eslip/{appointment_id}')
def eslip(appointment_id:int,user=Depends(patient_dep),db:Session=Depends(get_db)):
    a=db.get(Appointment,appointment_id)
    if not a or a.patient_id!=user.id: raise HTTPException(404,'Appointment not found')
    d=db.get(Doctor,a.doctor_id); du=db.get(User,d.user_id); h=db.get(Hospital,d.hospital_id); dep=db.get(Department,d.department_id); qr=qr_data_url({'appointment_id':a.id,'patient_id':user.id,'token':a.token_no}); return {'appointment_id':a.id,'patient':user.name,'hospital':h.name,'department':dep.name,'doctor':du.name,'date':str(a.appointment_date),'time':a.appointment_time.strftime('%H:%M'),'token':a.token_no,'fee':d.consultation_fee,'status':a.status,'qr':qr}
@router.get('/report/{appointment_id}')
def report(appointment_id:int,user=Depends(patient_dep),db:Session=Depends(get_db)):
    appointment=db.get(Appointment,appointment_id)
    if not appointment or appointment.patient_id!=user.id: raise HTTPException(404,'Appointment not found')
    if appointment.status!='completed': raise HTTPException(400,'Report is available after completion')
    doctor=db.get(Doctor,appointment.doctor_id); doctor_user=db.get(User,doctor.user_id); hospital=db.get(Hospital,doctor.hospital_id); department=db.get(Department,doctor.department_id); consultation=db.scalar(select(Consultation).where(Consultation.appointment_id==appointment.id))
    return {'appointment_id':appointment.id,'patient':user.name,'doctor':doctor_user.name,'specialization':doctor.specialization,'hospital':hospital.name,'department':department.name,'date':str(appointment.appointment_date),'time':appointment.appointment_time.strftime('%H:%M'),'symptoms':appointment.symptoms,'diagnosis':consultation.diagnosis if consultation else None,'notes':consultation.notes if consultation else None,'prescription':consultation.prescription if consultation else None,'followup_date':str(consultation.followup_date) if consultation and consultation.followup_date else None}
@router.post('/feedback')
def feedback(data:FeedbackIn,user=Depends(patient_dep),db:Session=Depends(get_db)):
    from ..models import Feedback
    a=db.get(Appointment,data.appointment_id)
    if not a or a.patient_id!=user.id: raise HTTPException(404,'Appointment not found')
    db.add(Feedback(appointment_id=a.id,rating=data.rating,comment=data.comment)); db.commit(); return {'message':'Thank you for your feedback'}
