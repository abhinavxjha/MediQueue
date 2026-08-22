from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .config import settings
from .database import get_db
from .models import User

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
oauth2 = OAuth2PasswordBearer(tokenUrl='/api/auth/login')


def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)

def create_token(user: User) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({'sub': str(user.id), 'role': user.role, 'exp': exp}, settings.SECRET_KEY, algorithm='HS256')

def get_current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> User:
    exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired token')
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        user_id = int(payload.get('sub'))
    except (JWTError, TypeError, ValueError):
        raise exc
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise exc
    return user

def require_roles(*roles):
    def dependency(user: User = Depends(get_current_user)):
        allowed = []
        for r in roles:
            if isinstance(r, (list, tuple)):
                allowed.extend([str(item).strip().lower() for item in r])
            else:
                allowed.append(str(r).strip().lower())
        if not user or not user.role or user.role.strip().lower() not in allowed:
            raise HTTPException(status_code=403, detail='Insufficient permissions')
        return user
    return dependency
