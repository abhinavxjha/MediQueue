from datetime import date
from fastapi import APIRouter,Depends
from sqlalchemy import select,func
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User,Hospital,Department,Doctor,Appointment,QueueEntry
from ..auth import require_roles
router=APIRouter(prefix='/api/admin',tags=['Admin']); admin_dep=require_roles('admin')
@router.get('/dashboard')
def dashboard(user=Depends(admin_dep),db:Session=Depends(get_db)):
    today=date.today(); total=db.scalar(select(func.count()).select_from(Appointment).where(Appointment.appointment_date==today)) or 0; completed=db.scalar(select(func.count()).select_from(Appointment).where(Appointment.appointment_date==today,Appointment.status=='completed')) or 0; waiting=db.scalar(select(func.count()).select_from(QueueEntry).where(QueueEntry.status=='waiting')) or 0; checked=db.scalar(select(func.count()).select_from(Appointment).where(Appointment.appointment_date==today,Appointment.status.in_(['checked_in','called']))) or 0; noshow=db.scalar(select(func.count()).select_from(Appointment).where(Appointment.status=='no_show')) or 0; doctors=db.scalar(select(func.count()).select_from(Doctor)) or 0; patients=db.scalar(select(func.count()).select_from(User).where(User.role=='patient')) or 0; depts=db.scalar(select(func.count()).select_from(Department)) or 0
    return {'kpis':{'patients_today':total,'completed':completed,'waiting':waiting,'checked_in':checked,'no_show_rate':round(noshow/max(total,1)*100,1),'doctors':doctors,'patients':patients,'departments':depts},'department_breakdown':department_breakdown(db)}
def department_breakdown(db):
    rows=db.execute(select(Department.name,func.count(Appointment.id)).select_from(Department).join(Doctor,Doctor.department_id==Department.id).join(Appointment,Appointment.doctor_id==Doctor.id).group_by(Department.name).order_by(func.count(Appointment.id).desc())).all(); return [{'department':name,'count':count} for name,count in rows]
@router.get('/doctors')
def doctors(user=Depends(admin_dep),db:Session=Depends(get_db)):
    rows=db.scalars(select(Doctor)).all(); out=[]
    for d in rows:
        u=db.get(User,d.user_id); dep=db.get(Department,d.department_id); h=db.get(Hospital,d.hospital_id); out.append({'id':d.id,'name':u.name,'specialization':d.specialization,'department':dep.name,'hospital':h.name,'available':d.is_available,'fee':d.consultation_fee})
    return out
