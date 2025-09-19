from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import Base, engine, get_db
from models import User
from schemas import UserCreate, UserOut, LoginRequest, TokenResponse, RideCreate, RideOut
from crud import create_user, get_user_by_email, create_ride, get_rides
from auth import verify_password, create_access_token

Base.metadata.create_all(bind=engine)

app = FastAPI()

# =========================
# Registro
# =========================
@app.post("/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Verifica se já existe email
    existing = get_user_by_email(db, user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email já registrado")

    # Valida senha
    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Senha muito curta (mínimo 6 caracteres)")

    return create_user(db, user)

# =========================
# Login
# =========================
@app.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, request.email)
    if not user or not verify_password(request.password, user.password):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

# =========================
# Corridas
# =========================
@app.post("/rides", response_model=RideOut)
def new_ride(ride: RideCreate, db: Session = Depends(get_db)):
    return create_ride(db, ride.origin, ride.destination, ride.passenger_id)

@app.get("/rides", response_model=list[RideOut])
def list_rides(db: Session = Depends(get_db)):
    return get_rides(db)
