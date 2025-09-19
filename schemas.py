from pydantic import BaseModel, EmailStr
from typing import Optional
from models import UserType, RideStatus

# =========================
# Usuários
# =========================
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    type: UserType
    name: Optional[str] = None

class UserOut(BaseModel):
    id: int
    email: EmailStr
    type: UserType
    name: Optional[str] = None

    class Config:
        from_attributes = True

# =========================
# Login
# =========================
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# =========================
# Corridas
# =========================
class RideCreate(BaseModel):
    origin: str
    destination: str
    passenger_id: int

class RideOut(BaseModel):
    id: int
    origin: str
    destination: str
    status: RideStatus
    passenger_id: int
    driver_id: Optional[int] = None

    class Config:
        from_attributes = True
