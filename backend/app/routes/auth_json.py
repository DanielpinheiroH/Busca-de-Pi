import base64
import hashlib
import hmac
import json
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel


router = APIRouter(prefix="/api/auth", tags=["Auth"])

BASE_DIR = Path(__file__).resolve().parents[2]
USERS_PATH = BASE_DIR / "data" / "usuarios.json"
SESSION_COOKIE = "busca_pi_session"
SESSION_MAX_AGE = 60 * 60 * 12
SECRET_KEY = os.getenv("SECRET_KEY", "dev_secret_key")


class LoginIn(BaseModel):
    login: str
    senha: str


def load_users():
    if not USERS_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail="Arquivo usuarios.json nao encontrado em backend/data.",
        )

    with open(USERS_PATH, "r", encoding="utf-8") as file:
        users = json.load(file)

    if not isinstance(users, list):
        raise HTTPException(
            status_code=500,
            detail="Arquivo usuarios.json deve conter uma lista de usuarios.",
        )

    return users


def public_user(user):
    return {
        "nome": user.get("nome", ""),
        "login": user.get("login", ""),
    }


def normalize_login(value):
    return str(value or "").strip().lower()


def sign(payload: str):
    return hmac.new(
        SECRET_KEY.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def create_session_value(user):
    payload = json.dumps(
        public_user(user),
        ensure_ascii=False,
        separators=(",", ":"),
    )
    encoded = base64.urlsafe_b64encode(payload.encode("utf-8")).decode("ascii")
    return f"{encoded}.{sign(encoded)}"


def read_session_value(value):
    if not value or "." not in value:
        return None

    encoded, signature = value.rsplit(".", 1)

    if not hmac.compare_digest(signature, sign(encoded)):
        return None

    try:
        payload = base64.urlsafe_b64decode(encoded.encode("ascii")).decode("utf-8")
        return json.loads(payload)
    except Exception:
        return None


def get_current_json_user(request: Request):
    session_value = (
        request.headers.get("x-session")
        or request.cookies.get(SESSION_COOKIE)
    )
    session = read_session_value(session_value)

    if not session:
        raise HTTPException(status_code=401, detail="Login necessario.")

    users = load_users()
    user = next(
        (
            item for item in users
            if normalize_login(item.get("login")) == normalize_login(session.get("login"))
            and item.get("ativo", True)
        ),
        None,
    )

    if not user:
        raise HTTPException(status_code=401, detail="Usuario sem acesso.")

    return public_user(user)


@router.post("/login")
def login(payload: LoginIn, response: Response):
    users = load_users()
    login_value = normalize_login(payload.login)

    user = next(
        (
            item for item in users
            if normalize_login(item.get("login")) == login_value
            and str(item.get("senha", "")) == payload.senha
            and item.get("ativo", True)
        ),
        None,
    )

    if not user:
        raise HTTPException(status_code=401, detail="Login ou senha invalidos.")

    session_value = create_session_value(user)

    response.set_cookie(
        key=SESSION_COOKIE,
        value=session_value,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        samesite="lax",
    )

    return {
        "user": public_user(user),
        "session": session_value,
    }


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE)
    return {"message": "Logout realizado."}


@router.get("/me")
def me(user=Depends(get_current_json_user)):
    return {"user": user}
