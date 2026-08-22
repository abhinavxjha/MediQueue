from fastapi import APIRouter,Depends,HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from ..database import get_db
from ..models import User,Appointment,Doctor,Hospital,Department,Consultation
from ..auth import require_roles
from ..services.slips import build_pdf
router=APIRouter(prefix='/api/slips',tags=['E-Slips']); patient_dep=require_roles('patient')
@router.get('/{appointment_id}/pdf')
def pdf(appointment_id:int,user=Depends(patient_dep),db=Depends(get_db)):
    a=db.get(Appointment,appointment_id)
    if not a or a.patient_id!=user.id: raise HTTPException(404,'Appointment not found')
    d=db.get(Doctor,a.doctor_id); du=db.get(User,d.user_id); h=db.get(Hospital,d.hospital_id); dep=db.get(Department,d.department_id); data={'Patient':user.name,'Appointment ID':a.id,'Hospital':h.name,'OPD':dep.name,'Doctor':du.name,'Date':a.appointment_date,'Time':a.appointment_time,'Token':a.token_no,'Consultation Fee':f'₹{d.consultation_fee:.2f}','Status':a.status}; return Response(build_pdf(data),media_type='application/pdf',headers={'Content-Disposition':f'attachment; filename=mediqueue-eslip-{a.id}.pdf'})
@router.get('/{appointment_id}/report.pdf')
def report_pdf(appointment_id:int,user=Depends(patient_dep),db=Depends(get_db)):
    a=db.get(Appointment,appointment_id)
    if not a or a.patient_id!=user.id: raise HTTPException(404,'Appointment not found')
    if a.status!='completed': raise HTTPException(400,'Report is available after completion')
    d=db.get(Doctor,a.doctor_id); du=db.get(User,d.user_id); h=db.get(Hospital,d.hospital_id); dep=db.get(Department,d.department_id); consultation=db.scalar(select(Consultation).where(Consultation.appointment_id==a.id))
    data={'Patient':user.name,'Hospital':h.name,'Department':dep.name,'Doctor':du.name,'Specialization':d.specialization,'Date':a.appointment_date,'Time':a.appointment_time,'Symptoms':a.symptoms or 'Not provided','Diagnosis':consultation.diagnosis if consultation and consultation.diagnosis else 'Not recorded','Doctor Notes':consultation.notes if consultation and consultation.notes else 'Not recorded','Prescription':consultation.prescription if consultation and consultation.prescription else 'Not recorded','Follow-up':consultation.followup_date if consultation and consultation.followup_date else 'Not scheduled'}
    return Response(build_pdf(data),media_type='application/pdf',headers={'Content-Disposition':f'attachment; filename=mediqueue-report-{a.id}.pdf'})
