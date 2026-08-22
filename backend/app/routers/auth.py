from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import RegisterIn,LoginIn
from ..auth import hash_password,verify_password,create_token,get_current_user
router=APIRouter(prefix='/api/auth',tags=['Authentication'])
@router.post('/register')
def register(data:RegisterIn,db:Session=Depends(get_db)):
    if db.scalar(select(User).where(User.email==data.email)): raise HTTPException(409,'Email already registered')
    u=User(name=data.name,email=data.email,phone=data.phone,password_hash=hash_password(data.password),role='patient'); db.add(u); db.commit(); db.refresh(u); return {'access_token':create_token(u),'token_type':'bearer','user':{'id':u.id,'name':u.name,'email':u.email,'role':u.role}}
@router.post('/login')
def login(data:LoginIn,db:Session=Depends(get_db)):
    u=db.scalar(select(User).where(User.email==data.email))
    if not u or not verify_password(data.password,u.password_hash): raise HTTPException(401,'Invalid email or password')
    return {'access_token':create_token(u),'token_type':'bearer','user':{'id':u.id,'name':u.name,'email':u.email,'role':u.role}}
@router.get('/me')
def me(user=Depends(get_current_user)): return {'id':user.id,'name':user.name,'email':user.email,'phone':user.phone,'role':user.role}
