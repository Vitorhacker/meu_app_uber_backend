# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Meu App Uber Backend")

# Permitir conexões do frontend e Railway
origins = [
    "http://localhost",
    "http://localhost:8081",
    "http://192.168.0.118:8081",  # seu IP local
    "https://meuappuberbackend-production.up.railway.app",  # URL do Railway
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Backend funcionando!"}

@app.get("/corridas/")
async def get_corridas():
    return [
        {"id": 1, "origem": "Rua A", "destino": "Rua B"},
        {"id": 2, "origem": "Rua C", "destino": "Rua D"}
    ]
