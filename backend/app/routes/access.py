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


def get_backend_url():
    return os.getenv("BACKEND_URL", "http://localhost:8000")


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
    approval_token = generate_token()

    access = AccessRequest(
        nome=payload.nome.strip(),
        email=payload.email.lower().strip(),
        setor=(payload.setor or "").strip(),
        status="PENDENTE",
        approval_token=approval_token,
    )

    db.add(access)
    db.commit()
    db.refresh(access)

    admin_email = get_admin_email()
    backend_url = get_backend_url()

    print("ADMIN_EMAIL carregado:", admin_email)

    approve_url = f"{backend_url}/api/access/approve/{approval_token}"
    reject_url = f"{backend_url}/api/access/reject/{approval_token}"

    if admin_email:
        send_email(
            to=admin_email,
            subject="Nova solicitação de acesso ao Busca de PI",
            body=f"""
Nova solicitação de acesso ao Busca de PI.

Nome: {access.nome}
E-mail: {access.email}
Setor: {access.setor or "-"}

Aprovar por 72 horas:
{approve_url}

Rejeitar:
{reject_url}
""".strip(),
        )
    else:
        print("ADMIN_EMAIL não encontrado no .env")

    return {
        "message": "Solicitação enviada. Aguarde aprovação por e-mail.",
        "status": access.status,
    }


@router.get("/approve/{token}")
def approve_access(token: str, db: Session = Depends(get_db)):
    access = (
        db.query(AccessRequest)
        .filter(AccessRequest.approval_token == token)
        .first()
    )

    if not access:
        raise HTTPException(
            status_code=404,
            detail="Solicitação não encontrada.",
        )

    access.status = "APROVADO"
    access.approved_at = datetime.utcnow()
    access.access_expires_at = datetime.utcnow() + timedelta(hours=72)
    access.session_token = generate_token()

    db.commit()
    db.refresh(access)

    frontend_url = get_frontend_url()

    login_url = (
        f"{frontend_url}/login-token?token={access.session_token}"
    )

    send_email(
        to=access.email,
        subject="Acesso liberado ao Busca de PI",
        body=f"""
Olá, {access.nome}.

Seu acesso ao Busca de PI foi aprovado por 72 horas.

Acesse pelo link abaixo:
{login_url}

O acesso expira em:
{access.access_expires_at.strftime("%d/%m/%Y %H:%M")}
""".strip(),
    )

    return {
        "message": (
            "Acesso aprovado por 72 horas. "
            "O link foi enviado ao usuário."
        ),
        "email": access.email,
        "expires_at": access.access_expires_at,
    }


@router.get("/reject/{token}")
def reject_access(token: str, db: Session = Depends(get_db)):
    access = (
        db.query(AccessRequest)
        .filter(AccessRequest.approval_token == token)
        .first()
    )

    if not access:
        raise HTTPException(
            status_code=404,
            detail="Solicitação não encontrada.",
        )

    access.status = "REJEITADO"
    access.rejected_at = datetime.utcnow()

    db.commit()

    return {
        "message": "Solicitação rejeitada.",
    }


@router.post("/magic-login")
def magic_login(
    payload: MagicLoginIn,
    db: Session = Depends(get_db),
):
    access = (
        db.query(AccessRequest)
        .filter(AccessRequest.session_token == payload.token)
        .first()
    )

    if not access:
        raise HTTPException(
            status_code=401,
            detail="Link inválido.",
        )

    if access.status != "APROVADO":
        raise HTTPException(
            status_code=403,
            detail="Acesso não aprovado.",
        )

    if (
        not access.access_expires_at
        or access.access_expires_at < datetime.utcnow()
    ):
        access.status = "EXPIRADO"
        db.commit()

        raise HTTPException(
            status_code=403,
            detail="Acesso expirado.",
        )

    jwt_token = create_access_jwt(
        access.id,
        access.email,
    )

    return {
        "token": jwt_token,
        "user": {
            "nome": access.nome,
            "email": access.email,
            "setor": access.setor,
            "expires_at": access.access_expires_at,
        },
    }