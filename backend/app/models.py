from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from app.database import Base


class AccessRequest(Base):
    __tablename__ = "access_requests"

    id = Column(Integer, primary_key=True, index=True)

    nome = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    setor = Column(String, nullable=True)

    status = Column(String, default="PENDENTE", index=True)
    # PENDENTE
    # APROVADO
    # REJEITADO
    # EXPIRADO

    approval_token = Column(
        String,
        nullable=False,
        unique=True,
        index=True,
    )

    session_token = Column(
        String,
        nullable=True,
        unique=True,
        index=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )

    approved_at = Column(
        DateTime,
        nullable=True,
    )

    rejected_at = Column(
        DateTime,
        nullable=True,
    )

    access_expires_at = Column(
        DateTime,
        nullable=True,
    )