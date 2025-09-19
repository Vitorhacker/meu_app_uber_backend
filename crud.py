from sqlalchemy.orm import Session
from models import User, Ride
from auth import get_password_hash


def create_user(db: Session, email: str, password: str, type: str, name: str = None):
    hashed_password = get_password_hash(password)
    user = User(email=email, password=hashed_password, type=type, name=name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def create_ride(db: Session, origin: str, destination: str, passenger_id: int):
    ride = Ride(origin=origin, destination=destination, passenger_id=passenger_id, status="pending")
    db.add(ride)
    db.commit()
    db.refresh(ride)
    return ride
