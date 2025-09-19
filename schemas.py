from pydantic import BaseModel
from typing import Optional


# =========================
# Usuários
# =========================
class UserCreate(BaseModel):
    email: str
    password: str
    type: str  # "passageiro" ou "motorista"
    name: Optional[str] = None


class UserOut(BaseModel):
    id: int
    email: str
    type: str
    name: Optional[str] = None

    class Config:
        from_attributes = True


# =========================
# Corridas
# =========================
class RideCreate(BaseModel):
    origem: str
    destino: str
    passenger_id: int


class RideOut(BaseModel):
    id: int
    origin: str
    destination: str
    status: str
    passenger_id: int
    driver_id: Optional[int] = None

    class Config:
        from_attributes = True
