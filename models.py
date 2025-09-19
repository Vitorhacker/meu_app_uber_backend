from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    type = Column(String, nullable=False)  # "passageiro" ou "motorista"
    name = Column(String, nullable=True)

    rides = relationship("Ride", back_populates="passenger")


class Ride(Base):
    __tablename__ = "rides"

    id = Column(Integer, primary_key=True, index=True)
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    status = Column(String, default="pending")
    passenger_id = Column(Integer, ForeignKey("users.id"))
    driver_id = Column(Integer, nullable=True)

    passenger = relationship("User", back_populates="rides")
