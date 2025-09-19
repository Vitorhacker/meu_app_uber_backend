from sqlalchemy.orm import Session
from models import Ride, RideStatus

def get_rides(db: Session):
    return db.query(Ride).all()

def get_ride(db: Session, ride_id: int):
    return db.query(Ride).filter(Ride.id == ride_id).first()

def create_ride(db: Session, origem: str, destino: str, passenger_id: int):
    ride = Ride(origin=origem, destination=destino, passenger_id=passenger_id)
    db.add(ride)
    db.commit()
    db.refresh(ride)
    return ride

def accept_ride(db: Session, ride_id: int, driver_id: int):
    ride = get_ride(db, ride_id)
    if ride:
        ride.status = RideStatus.accepted
        ride.driver_id = driver_id
        ride.driver_lat = "-23.5505"
        ride.driver_lng = "-46.6333"
        db.commit()
        db.refresh(ride)
    return ride

def update_driver_location(db: Session, ride_id: int, lat: float, lng: float):
    ride = get_ride(db, ride_id)
    if ride:
        ride.driver_lat = str(lat)
        ride.driver_lng = str(lng)
        db.commit()
        db.refresh(ride)
    return ride
