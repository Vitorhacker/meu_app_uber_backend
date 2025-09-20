from database import Base, engine
from models import User, Ride

if __name__ == "__main__":
    print("🔄 Criando tabelas no banco...")
    Base.metadata.create_all(bind=engine)
    print("✅ Banco inicializado com sucesso!")
