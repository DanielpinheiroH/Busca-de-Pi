import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parents[1]

load_dotenv(BASE_DIR / ".env")

from app.database import Base, engine
from app.routes.access import router as access_router
from app.routes.busca_pi import router as busca_pi_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Busca de PI API")

frontend_url = os.getenv("FRONTEND_URL", "").rstrip("/")
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(access_router)
app.include_router(busca_pi_router)


@app.get("/")
def health():
    return {
        "status": "ok",
        "message": "API Busca de PI rodando.",
    }
