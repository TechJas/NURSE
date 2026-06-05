from fastapi import Depends, HTTPException, status
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def decode_token(token: str):
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_nurse_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    if payload.get("role") != "nurse":
        raise HTTPException(status_code=403, detail="Nurse access required")
    return payload

def get_current_admin_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload
