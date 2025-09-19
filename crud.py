# crud.py
from sqlalchemy.orm import Session
from models import Ride, RideStatus
from schemas import RideCreate

def get_rides(db: Session):
    return db.query(Ride).all()

def get_ride(db: Session, ride_id: int):
    return db.query(Ride).filter(Ride.id == ride_id).first()

def create_ride(db: Session, ride: RideCreate, passenger_id: int):
    db_ride = Ride(origin=ride.origin, destination=ride.destination, passenger_id=passenger_id)
    db.add(db_ride)
    db.commit()
    db.refresh(db_ride)
    return db_ride

def accept_ride(db: Session, ride_id: int, driver_id: int):
    ride = get_ride(db, ride_id)
    if ride and ride.status == RideStatus.pending:
        ride.status = RideStatus.in_progress
        ride.driver_id = driver_id
        db.commit()
        db.refresh(ride)
        return ride
    return None
