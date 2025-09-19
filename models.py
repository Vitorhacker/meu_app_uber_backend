import enum
from sqlalchemy import Column, Integer, String, Enum, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

# =========================
# Enums
# =========================
class UserType(str, enum.Enum):
    passageiro = "passageiro"
    motorista = "motorista"

class RideStatus(str, enum.Enum):
    esperando = "esperando"
    em_andamento = "em_andamento"
    finalizada = "finalizada"

# =========================
# Usuários
# =========================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    name = Column(String, nullable=True)
    type = Column(Enum(UserType), nullable=False)

    rides = relationship("Ride", back_populates="passenger", foreign_keys="Ride.passenger_id")
    drives = relationship("Ride", back_populates="driver", foreign_keys="Ride.driver_id")

# =========================
# Corridas
# =========================
class Ride(Base):
    __tablename__ = "rides"

    id = Column(Integer, primary_key=True, index=True)
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    status = Column(Enum(RideStatus), default=RideStatus.esperando)

    passenger_id = Column(Integer, ForeignKey("users.id"))
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    passenger = relationship("User", back_populates="rides", foreign_keys=[passenger_id])
    driver = relationship("User", back_populates="drives", foreign_keys=[driver_id])
