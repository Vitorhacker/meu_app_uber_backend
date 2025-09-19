from sqlalchemy.orm import Session
from models import User, Ride, RideStatus
from schemas import UserCreate
from auth import get_password_hash

# =========================
# Usuários
# =========================
def create_user(db: Session, user: UserCreate):
    db_user = User(
        email=user.email,
        password=get_password_hash(user.password),
        type=user.type,
        name=user.name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

# =========================
# Corridas
# =========================
def create_ride(db: Session, origin: str, destination: str, passenger_id: int):
    db_ride = Ride(
        origin=origin,
        destination=destination,
        passenger_id=passenger_id,
        status=RideStatus.esperando
    )
    db.add(db_ride)
    db.commit()
    db.refresh(db_ride)
    return db_ride

def get_rides(db: Session):
    return db.query(Ride).all()
