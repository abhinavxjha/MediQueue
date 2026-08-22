from fastapi import APIRouter,Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import QueueEntry
from ..auth import get_current_user
router=APIRouter(prefix='/api/queue',tags=['Queue'])
@router.get('/doctor/{doctor_id}')
def doctor_queue(doctor_id:int,db:Session=Depends(get_db),user=Depends(get_current_user)):
    rows=db.scalars(select(QueueEntry).where(QueueEntry.doctor_id==doctor_id,QueueEntry.status.in_(['waiting','called'])).order_by(QueueEntry.queue_position)).all(); return [{'token':r.token_no,'position':r.queue_position,'status':r.status,'checked_in':r.checked_in_time.isoformat() if r.checked_in_time else None} for r in rows]
