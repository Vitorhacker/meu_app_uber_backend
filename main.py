# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Meu App Uber Backend")

# Permitir conexões do frontend
origins = [
    "http://localhost",
    "http://localhost:8081",
    "http://192.168.0.118:8081",  # seu IP do PC
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint de teste
@app.get("/")
async def root():
    return {"message": "Backend funcionando!"}

# Endpoint para corridas
@app.get("/corridas/")
async def get_corridas():
    return [
        {"id": 1, "origem": "Rua A", "destino": "Rua B"},
        {"id": 2, "origem": "Rua C", "destino": "Rua D"}
    ]
