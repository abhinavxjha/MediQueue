from fastapi import APIRouter,Depends
from ..auth import require_roles
from ..services.ml import models
router=APIRouter(prefix='/api/analytics',tags=['Data Science']); admin_dep=require_roles('admin')
@router.post('/waiting-time')
def waiting_time(payload:dict,user=Depends(admin_dep)):
    p={'queue_size':payload.get('queue_size',5),'hour':payload.get('hour',12),'day':payload.get('day',0),'avg_consultation':payload.get('avg_consultation',12),'available_doctors':payload.get('available_doctors',1)}; return {'estimated_waiting_minutes':models.wait(p),'model':'Random Forest Regressor','mae':round(models.wait_mae,2),'rmse':round(models.wait_rmse,2),'r2':round(models.wait_r2,3)}
@router.post('/no-show')
def no_show(payload:dict,user=Depends(admin_dep)):
    p={'lead_time_days':payload.get('lead_time_days',7),'hour':payload.get('hour',12),'day':payload.get('day',0),'previous_no_show':payload.get('previous_no_show',0),'cancellation_history':payload.get('cancellation_history',0)}; return {'no_show_probability':models.no_show(p),'model':'Random Forest Classifier','accuracy':round(models.no_show_accuracy,3)}
