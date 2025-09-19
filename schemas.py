from pydantic import BaseModel
from typing import Optional
from models import UserType, RideStatus

# =========================
# Usuários
# =========================
class UserCreate(BaseModel):
    email: str
    password: str
    type: UserType
    name: Optional[str] = None

class UserOut(BaseModel):
    id: int
    email: str
    type: UserType
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
    status: RideStatus
    passenger_id: int
    driver_id: Optional[int] = None
    driverLocation: Optional[dict] = None

    class Config:
        from_attributes = True

class RideMap(BaseModel):
    id: int
    origem: str
    destino: str
    status: str
    driverLocation: Optional[dict] = None
