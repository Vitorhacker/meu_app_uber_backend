from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from database import get_db, Base, engine
from models import Ride, User
from schemas import RideMap, RideCreate, RideOut, UserCreate, UserOut
from crud import get_rides, get_ride, create_ride, accept_ride, update_driver_location
from auth import authenticate_user, get_password_hash, create_access_token, verify_password

# Cria tabelas
Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Corridas
# =========================
@app.get("/rides", response_model=List[RideMap])
def read_rides(db: Session = Depends(get_db)):
    rides = get_rides(db)
    result = []
    for r in rides:
        driverLocation = None
        if hasattr(r, "driver_lat") and hasattr(r, "driver_lng") and r.driver_lat and r.driver_lng:
            driverLocation = {"lat": float(r.driver_lat), "lng": float(r.driver_lng)}
        result.append({
            "id": r.id,
            "origem": r.origin,
            "destino": r.destination,
            "status": r.status.value,
            "driverLocation": driverLocation
        })
    return result

@app.post("/rides", response_model=RideOut)
def criar_corrida(ride: RideCreate, db: Session = Depends(get_db)):
    nova = create_ride(db, ride.origin, ride.destination, getattr(ride, "passenger_id", None))
    if not nova:
        raise HTTPException(status_code=400, detail="Erro ao criar corrida")
    return nova

@app.post("/rides/{ride_id}/accept", response_model=RideOut)
def aceitar_corrida(ride_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    driver_id = data.get("driver_id")
    if not driver_id:
        raise HTTPException(status_code=400, detail="driver_id é obrigatório")
    ride = accept_ride(db, ride_id, driver_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Corrida não encontrada")
    return ride

@app.post("/rides/{ride_id}/update-location", response_model=RideOut)
def atualizar_local(ride_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    lat = data.get("lat")
    lng = data.get("lng")
    if lat is None or lng is None:
        raise HTTPException(status_code=400, detail="lat e lng são obrigatórios")
    ride = update_driver_location(db, ride_id, lat, lng)
    if not ride:
        raise HTTPException(status_code=404, detail="Corrida não encontrada")
    return ride

# =========================
# Usuário / Auth
# =========================
@app.post("/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    hashed = get_password_hash(user.password)
    db_user = User(email=user.email, password=hashed, type=user.type, name=user.name)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/login")
def login(data: dict = Body(...), db: Session = Depends(get_db)):
    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email e senha são obrigatórios")
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password):
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos")
    token = create_access_token({"sub": user.id})
    return {"access_token": token, "token_type": "bearer"}
