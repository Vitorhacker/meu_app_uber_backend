from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Meu App Uber Backend")

# Permitir conexões de qualquer origem (para teste em produção)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        {"id": 1, "origem": "Rua A", "destino": "Rua B", "status": "Pendente"},
        {"id": 2, "origem": "Rua C", "destino": "Rua D", "status": "Confirmada"},
    ]
