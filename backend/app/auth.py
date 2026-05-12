import os
import secrets
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AccessRequest

SECRET_KEY = os.getenv("SECRET_KEY", "dev_secret_key")
ALGORITHM = "HS256"

security = HTTPBearer()


def generate_token() -> str:
    return secrets.token_urlsafe(48)


def create_access_jwt(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=72),
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_access(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Token inválido.")

    access = db.query(AccessRequest).filter(AccessRequest.id == user_id).first()

    if not access:
        raise HTTPException(status_code=401, detail="Acesso não encontrado.")

    if access.status != "APROVADO":
        raise HTTPException(status_code=403, detail="Acesso não aprovado.")

    if not access.access_expires_at or access.access_expires_at < datetime.utcnow():
        access.status = "EXPIRADO"
        db.commit()
        raise HTTPException(status_code=403, detail="Acesso expirado.")

    return access