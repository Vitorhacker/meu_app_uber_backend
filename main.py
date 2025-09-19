from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from schemas import Ride
from rides_data import corridas_data

app = FastAPI(title="Uber Brasil Backend")

# CORS
origins = [
    "http://localhost:19006",
    "https://brilliant-motivation-production.up.railway.app",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Funções mock de corridas
# =========================
def get_rides():
    return corridas_data

def get_ride(ride_id: int):
    for ride in corridas_data:
        if ride["id"] == ride_id:
            return ride
    return None

# =========================
# Endpoints
# =========================
@app.get("/rides", response_model=List[Ride])
def read_rides():
    return get_rides()

@app.post("/rides/{ride_id}/accept", response_model=Ride)
def accept_ride_endpoint(ride_id: int):
    ride = get_ride(ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Corrida não encontrada")
    if ride["status"] != "Pendente":
        raise HTTPException(status_code=400, detail="Corrida já aceita")
    ride["status"] = "Em Andamento"
    ride["driverLocation"] = {"lat": -23.5505, "lng": -46.6333}
    return ride

@app.post("/rides/{ride_id}/update-location", response_model=Ride)
def update_driver_location(ride_id: int, lat: float, lng: float):
    ride = get_ride(ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Corrida não encontrada")
    if ride["status"] != "Em Andamento":
        raise HTTPException(status_code=400, detail="Corrida não iniciada")
    ride["driverLocation"] = {"lat": lat, "lng": lng}
    return ride
