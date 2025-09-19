from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from rides_data import corridas_data
from schemas import RideFront, RideCreate
from auth import get_password_hash
from fastapi.params import Body

app = FastAPI(title="Meu App Uber Backend")

origins = [
    "http://localhost:19006",
    "https://brilliant-motivation-production.up.railway.app",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Corridas
# =========================
@app.get("/rides", response_model=List[RideFront])
def listar_corridas():
    return corridas_data

@app.post("/rides", response_model=RideFront)
def criar_corrida(origem: str = Body(...), destino: str = Body(...), userId: int = Body(...)):
    novo_id = max([r["id"] for r in corridas_data]) + 1 if corridas_data else 1
    nova = {"id": novo_id, "origem": origem, "destino": destino, "status": "Pendente", "driverLocation": None}
    corridas_data.append(nova)
    return nova

@app.post("/rides/{ride_id}/accept", response_model=RideFront)
def aceitar_corrida(ride_id: int):
    ride = next((r for r in corridas_data if r["id"] == ride_id), None)
    if not ride:
        raise HTTPException(status_code=404, detail="Corrida não encontrada")
    if ride["status"] != "Pendente":
        raise HTTPException(status_code=400, detail="Corrida já aceita")
    ride["status"] = "Em Andamento"
    ride["driverLocation"] = {"lat": -23.5505, "lng": -46.6333}
    return ride

@app.post("/rides/{ride_id}/update-location", response_model=RideFront)
def atualizar_localizacao(ride_id: int, lat: float = Body(...), lng: float = Body(...)):
    ride = next((r for r in corridas_data if r["id"] == ride_id), None)
    if not ride:
        raise HTTPException(status_code=404, detail="Corrida não encontrada")
    if ride["status"] != "Em Andamento":
        raise HTTPException(status_code=400, detail="Corrida não iniciada")
    ride["driverLocation"] = {"lat": lat, "lng": lng}
    return ride

# =========================
# Login / Register (mock)
# =========================
@app.post("/login")
def login(email: str = Body(...), password: str = Body(...)):
    # Retorna sucesso mock
    return {"message": f"Usuário {email} logado com sucesso"}

@app.post("/register")
def register(name: str = Body(...), email: str = Body(...), password: str = Body(...), role: str = Body(...)):
    # Retorna sucesso mock
    hashed_password = get_password_hash(password)
    return {"message": f"Usuário {name} registrado com sucesso", "password_hash": hashed_password}
