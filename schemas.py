from pydantic import BaseModel
from typing import Optional
from models import UserType, RideStatus

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

class RideCreate(BaseModel):
    origin: str
    destination: str

class RideOut(BaseModel):
    id: int
    origin: str
    destination: str
    status: RideStatus
    passenger_id: int
    driver_id: Optional[int] = None

    class Config:
        from_attributes = True

class RideFront(BaseModel):
    id: int
    origem: str
    destino: str
    status: str
    driverLocation: Optional[dict] = None
