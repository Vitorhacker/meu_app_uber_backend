from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, Base, get_db
from models import User, Ride
from schemas import UserCreate, UserOut, RideCreate, RideOut
from auth import get_password_hash, create_access_token, authenticate_user

# Cria as tabelas no banco
Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS liberado (pode restringir depois para segurança)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Usuários
# =========================
@app.post("/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email já registrado")

    hashed_password = get_password_hash(user.password)
    new_user = User(email=user.email, password=hashed_password, type=user.type, name=user.name)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/login")
def login(data: dict = Body(...), db: Session = Depends(get_db)):
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email e senha são obrigatórios")

    user = authenticate_user(db, email, password)
    if not user:
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos")

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


# =========================
# Corridas
# =========================
@app.post("/rides", response_model=RideOut)
def create_ride(ride: RideCreate, db: Session = Depends(get_db)):
    passenger = db.query(User).filter(User.id == ride.passenger_id).first()
    if not passenger:
        raise HTTPException(status_code=404, detail="Passageiro não encontrado")

    new_ride = Ride(
        origin=ride.origem,
        destination=ride.destino,
        passenger_id=ride.passenger_id,
        status="pending"
    )
    db.add(new_ride)
    db.commit()
    db.refresh(new_ride)
    return new_ride


@app.get("/")
def root():
    return {"message": "API funcionando 🚀"}
