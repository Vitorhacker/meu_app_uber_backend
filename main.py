# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from database import get_db
from crud import get_rides, accept_ride, create_ride
from rides_data import corridas_data
from schemas import Ride

app = FastAPI()

# Permitir acesso do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/rides", response_model=List[Ride])
def read_rides():
    return get_rides()

@app.post("/rides/{ride_id}/accept", response_model=Ride)
def accept_ride(ride_id: int):
    ride = get_ride(ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Corrida não encontrada")
    if ride['status'] != "Pendente":
        raise HTTPException(status_code=400, detail="Corrida já aceita")
    
    ride['status'] = "Em Andamento"
    ride['driverLocation'] = {"lat": -23.5505, "lng": -46.6333}  # posição inicial do motorista
    return ride

@app.post("/rides/{ride_id}/update-location", response_model=Ride)
def update_driver_location(ride_id: int, lat: float, lng: float):
    ride = get_ride(ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Corrida não encontrada")
    if ride['status'] != "Em Andamento":
        raise HTTPException(status_code=400, detail="Corrida não iniciada")
    
    ride['driverLocation'] = {"lat": lat, "lng": lng}
    return ride
