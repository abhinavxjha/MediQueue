from datetime import datetime,date
from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User,Doctor,Appointment,QueueEntry,Slot,Consultation
from ..schemas import ConsultationIn,SlotIn
from ..auth import require_roles
from ..services.queue import refresh_positions
router=APIRouter(prefix='/api/doctor',tags=['Doctor']); doc_dep=require_roles('doctor')
def get_doctor(user,db):
    d=db.scalar(select(Doctor).where(Doctor.user_id==user.id));
    if not d: raise HTTPException(404,'Doctor profile not found')
    return d
@router.get('/dashboard')
def dashboard(user=Depends(doc_dep),db:Session=Depends(get_db)):
    d=get_doctor(user,db); apps=db.scalars(select(Appointment).where(Appointment.doctor_id==d.id,Appointment.appointment_date==date.today()).order_by(Appointment.appointment_time)).all(); q=db.scalars(select(QueueEntry).where(QueueEntry.doctor_id==d.id,QueueEntry.status.in_(['waiting','called'])).order_by(QueueEntry.queue_position)).all(); return {'doctor':{'id':d.id,'name':user.name,'specialization':d.specialization},'stats':{'booked':len(apps),'checked_in':sum(a.status=='checked_in' for a in apps),'completed':sum(a.status=='completed' for a in apps),'waiting':sum(x.status=='waiting' for x in q)},'queue':[{'id':x.id,'token':x.token_no,'position':x.queue_position,'status':x.status,'patient_id':x.patient_id,'appointment_id':x.appointment_id} for x in q]}
@router.post('/queue/next')
def next_patient(user=Depends(doc_dep),db:Session=Depends(get_db)):
    d=get_doctor(user,db); refresh_positions(db,d.id); q=db.scalar(select(QueueEntry).where(QueueEntry.doctor_id==d.id,QueueEntry.status=='waiting').order_by(QueueEntry.queue_position))
    if not q: raise HTTPException(404,'No waiting patient')
    q.status='called'; q.called_time=datetime.utcnow(); db.get(Appointment,q.appointment_id).status='called'; db.commit(); return {'message':'Next patient called','token':q.token_no,'patient_id':q.patient_id}
@router.post('/queue/{queue_id}/complete')
def complete(queue_id:int,data:ConsultationIn,user=Depends(doc_dep),db:Session=Depends(get_db)):
    d=get_doctor(user,db); q=db.get(QueueEntry,queue_id)
    if not q or q.doctor_id!=d.id: raise HTTPException(404,'Queue entry not found')
    q.status='completed'; q.completed_time=datetime.utcnow(); a=db.get(Appointment,q.appointment_id); a.status='completed'; db.add(Consultation(appointment_id=a.id,doctor_id=d.id,notes=data.notes,diagnosis=data.diagnosis,prescription=data.prescription,followup_date=data.followup_date)); refresh_positions(db,d.id); db.commit(); return {'message':'Consultation completed'}
@router.post('/slots')
def add_slot(data:SlotIn,user=Depends(doc_dep),db:Session=Depends(get_db)):
    d=get_doctor(user,db); existing=db.scalar(select(Slot).where(Slot.doctor_id==d.id,Slot.date==data.date,Slot.start_time==data.start_time))
    if existing: raise HTTPException(409,'Slot already exists')
    s=Slot(doctor_id=d.id,**data.model_dump()); db.add(s); db.commit(); db.refresh(s); return {'id':s.id,'message':'Slot created'}
@router.get('/appointments')
def appointments(user=Depends(doc_dep),db:Session=Depends(get_db)):
    d=get_doctor(user,db); rows=db.scalars(select(Appointment).where(Appointment.doctor_id==d.id).order_by(Appointment.appointment_date.desc(),Appointment.appointment_time)).all(); return [{'id':a.id,'date':str(a.appointment_date),'time':a.appointment_time.strftime('%H:%M'),'token':a.token_no,'status':a.status,'patient_id':a.patient_id,'symptoms':a.symptoms} for a in rows]
