import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_access

router = APIRouter(prefix="/api/busca-pi", tags=["Busca PI"])

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_PATH = BASE_DIR / "data" / "dados.json"


def normalize(value: str) -> str:
    return "".join(ch for ch in (value or "") if ch.isdigit())


def load_data():
    if not DATA_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail="Arquivo dados.json não encontrado em backend/data.",
        )

    with open(DATA_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


@router.get("")
def buscar_pi(
    pi: str = Query("", alias="pi"),
    cnpj: str = Query("", alias="cnpj"),
    fim_veiculacao: str = Query("", alias="fimVeiculacao"),
    current_user=Depends(get_current_access),
):
    data = load_data()

    pi_norm = normalize(pi)
    cnpj_norm = normalize(cnpj)

    result = data

    if pi_norm:
        result = [
            item for item in result
            if normalize(item.get("pi", "")) == pi_norm
        ]

    if cnpj_norm:
        result = [
            item for item in result
            if cnpj_norm in normalize(item.get("cnpjAnunciante", ""))
        ]

    if fim_veiculacao:
        result = [
            item for item in result
            if item.get("fimVeiculacao") == fim_veiculacao
        ]

    result = sorted(
        result,
        key=lambda item: item.get("dataVenda") or "",
        reverse=True,
    )

    return {
        "total": len(result),
        "items": result,
}