import os
from pathlib import Path
from datetime import datetime, timedelta

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.auth import create_access_jwt, generate_token
from app.database import get_db
from app.email_service import send_email
from app.models import AccessRequest

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

router = APIRouter(prefix="/api/access", tags=["Access"])


def get_admin_email():
    return os.getenv("ADMIN_EMAIL")


def get_frontend_url():
    return os.getenv("FRONTEND_URL", "http://localhost:5173")


class AccessRequestIn(BaseModel):
    nome: str
    email: EmailStr
    setor: str | None = None


class MagicLoginIn(BaseModel):
    token: str


@router.post("/request")
def request_access(payload: AccessRequestIn, db: Session = Depends(get_db)):
    access = AccessRequest(
        nome=payload.nome.strip(),
        email=payload.email.lower().strip(),
        setor=(payload.setor or "").strip(),
        status="APROVADO",
        approval_token=generate_token(),
        session_token=generate_token(),
        approved_at=datetime.utcnow(),
        access_expires_at=datetime.utcnow() + timedelta(hours=72),
    )

    db.add(access)
    db.commit()
    db.refresh(access)

    frontend_url = get_frontend_url()
    login_url = f"{frontend_url}/login-token?token={access.session_token}"

    admin_email = get_admin_email()

    if admin_email:
        send_email(
            to=admin_email,
            subject="Novo acesso gerado - Busca de PI",
            body=f"""
Novo acesso gerado automaticamente.

Nome: {access.nome}
E-mail: {access.email}
Setor: {access.setor or "-"}

LINK MÁGICO:
{login_url}

Expira em:
{access.access_expires_at.strftime("%d/%m/%Y %H:%M")}
""".strip(),
        )

    return {
        "message": "Solicitação recebida. Link de acesso gerado.",
        "status": access.status,
        "login_url": login_url,
        "expires_at": access.access_expires_at,
    }


@router.get("/approve/{token}")
def approve_access(token: str, db: Session = Depends(get_db)):
    access = (
        db.query(AccessRequest)
        .filter(AccessRequest.approval_token == token)
        .first()
    )

    if not access:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada.")

    access.status = "APROVADO"
    access.approved_at = datetime.utcnow()
    access.access_expires_at = datetime.utcnow() + timedelta(hours=72)
    access.session_token = generate_token()

    db.commit()
    db.refresh(access)

    frontend_url = get_frontend_url()
    login_url = f"{frontend_url}/login-token?token={access.session_token}"

    return {
        "message": "Acesso aprovado por 72 horas.",
        "email": access.email,
        "expires_at": access.access_expires_at,
        "login_url": login_url,
    }


@router.get("/reject/{token}")
def reject_access(token: str, db: Session = Depends(get_db)):
    access = (
        db.query(AccessRequest)
        .filter(AccessRequest.approval_token == token)
        .first()
    )

    if not access:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada.")

    access.status = "REJEITADO"
    access.rejected_at = datetime.utcnow()

    db.commit()

    return {"message": "Solicitação rejeitada."}


@router.post("/magic-login")
def magic_login(payload: MagicLoginIn, db: Session = Depends(get_db)):
    access = (
        db.query(AccessRequest)
        .filter(AccessRequest.session_token == payload.token)
        .first()
    )

    if not access:
        raise HTTPException(status_code=401, detail="Link inválido.")

    if access.status != "APROVADO":
        raise HTTPException(status_code=403, detail="Acesso não aprovado.")

    if not access.access_expires_at or access.access_expires_at < datetime.utcnow():
        access.status = "EXPIRADO"
        db.commit()
        raise HTTPException(status_code=403, detail="Acesso expirado.")

    jwt_token = create_access_jwt(access.id, access.email)

    return {
        "token": jwt_token,
        "user": {
            "nome": access.nome,
            "email": access.email,
            "setor": access.setor,
            "expires_at": access.access_expires_at,
        },
    }