from sqlalchemy import Column, Integer, String, Enum, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import enum

class UserType(str, enum.Enum):
    passenger = "passageiro"
    driver = "motorista"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    type = Column(Enum(UserType))
    name = Column(String, nullable=True)

    rides = relationship("Ride", back_populates="user")

class RideStatus(str, enum.Enum):
    pending = "Pendente"
    accepted = "Aceita"
    finished = "Finalizada"

class Ride(Base):
    __tablename__ = "rides"

    id = Column(Integer, primary_key=True, index=True)
    origin = Column(String)
    destination = Column(String)
    status = Column(Enum(RideStatus), default=RideStatus.pending)
    passenger_id = Column(Integer, ForeignKey("users.id"))
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    user = relationship("User", foreign_keys=[passenger_id], back_populates="rides")
