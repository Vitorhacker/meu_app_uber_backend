-- ===========================================
-- USERS
-- ===========================================
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    telefone VARCHAR(20) UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('passenger', 'driver', 'admin')) DEFAULT 'passenger',
    foto_perfil TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_login TIMESTAMP NULL
);

-- Drivers
CREATE TABLE IF NOT EXISTS drivers (
    id BIGINT PRIMARY KEY,
    cnh_numero VARCHAR(30),
    cnh_validade DATE,
    status_verificacao VARCHAR(20) CHECK (status_verificacao IN ('pendente','aprovado','rejeitado')) DEFAULT 'pendente',
    avaliacao_media DECIMAL(3,2) DEFAULT 0,
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- Passengers
CREATE TABLE IF NOT EXISTS passengers (
    id BIGINT PRIMARY KEY,
    metodo_pagamento_preferido VARCHAR(20) CHECK (metodo_pagamento_preferido IN ('pix','cartao','carteira','dinheiro')),
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    id BIGSERIAL PRIMARY KEY,
    driver_id BIGINT NOT NULL,
    marca VARCHAR(50),
    modelo VARCHAR(50),
    ano INT,
    placa VARCHAR(20) UNIQUE,
    categoria VARCHAR(20) CHECK (categoria IN ('flash','hatch','sedan','luxo','moto')) DEFAULT 'hatch',
    cor VARCHAR(30),
    status VARCHAR(20) CHECK (status IN ('ativo','inativo')) DEFAULT 'ativo',
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

-- Rides (driver_id agora é NULLABLE)
CREATE TABLE IF NOT EXISTS rides (
    id BIGSERIAL PRIMARY KEY,
    passenger_id BIGINT NOT NULL,
    driver_id BIGINT NULL,
    vehicle_id BIGINT,
    origem_lat DECIMAL(10,7),
    origem_lng DECIMAL(10,7),
    destino_lat DECIMAL(10,7),
    destino_lng DECIMAL(10,7),
    distancia_km DECIMAL(6,2),
    tempo_estimado_min INT,
    preco DECIMAL(10,2),
    forma_pagamento VARCHAR(20) CHECK (forma_pagamento IN ('pix','cartao','carteira','dinheiro')),
    status VARCHAR(20) CHECK (status IN ('solicitada','aceita','em_andamento','concluida','cancelada')) DEFAULT 'solicitada',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finalizado_em TIMESTAMP NULL,
    FOREIGN KEY (passenger_id) REFERENCES passengers(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    ride_id BIGINT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    metodo VARCHAR(20) CHECK (metodo IN ('pix','cartao','carteira','dinheiro')),
    status VARCHAR(20) CHECK (status IN ('pendente','pago','falhou','estornado','expirado','contestacao')) DEFAULT 'pendente',
    transacao_id VARCHAR(255),
    provider VARCHAR(50),
    data_pagamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id BIGSERIAL PRIMARY KEY,
    ride_id BIGINT NOT NULL,
    avaliador_id BIGINT NOT NULL,
    avaliado_id BIGINT NOT NULL,
    nota INT CHECK (nota >= 1 AND nota <= 5),
    comentario TEXT,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
    FOREIGN KEY (avaliador_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (avaliado_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Driver Location
CREATE TABLE IF NOT EXISTS driver_locations (
    driver_id BIGINT PRIMARY KEY,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    ultima_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

-- Ride Categories
CREATE TABLE IF NOT EXISTS ride_categories (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(50) UNIQUE,
    descricao TEXT,
    tarifa_base DECIMAL(10,2) DEFAULT 0,
    preco_por_km DECIMAL(10,2) DEFAULT 0,
    preco_por_min DECIMAL(10,2) DEFAULT 0
);

-- ===========================================
-- WALLET & FINANCE
-- ===========================================

-- Wallet per user
CREATE TABLE IF NOT EXISTS wallets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  reserved DECIMAL(14,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'BRL',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

-- Ledger entries
CREATE TABLE IF NOT EXISTS ledger_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  related_table VARCHAR(50),
  related_id BIGINT,
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  balance_after DECIMAL(14,2) NOT NULL,
  metadata JSONB,
  idempotency_key VARCHAR(128),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Payout requests
CREATE TABLE IF NOT EXISTS driver_payouts (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  fee DECIMAL(14,2) DEFAULT 0,
  net_amount DECIMAL(14,2) NOT NULL,
  provider VARCHAR(50),
  provider_reference VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

-- Withdraw Requests (NOVO)
CREATE TABLE IF NOT EXISTS withdraw_requests (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('pending','approved','rejected','processed')) DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  processed_at TIMESTAMP,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

-- Platform accounts
CREATE TABLE IF NOT EXISTS platform_accounts (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'BRL',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Idempotency keys
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Webhook Logs
CREATE TABLE IF NOT EXISTS payment_webhook_logs (
    id BIGSERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL DEFAULT 'picpay',
    reference_id VARCHAR(255),
    status VARCHAR(50),
    raw_payload JSONB NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_webhook_reference ON payment_webhook_logs(reference_id);

-- ===========================================
-- SUPORTE E COMUNICAÇÃO
-- ===========================================

-- Support
CREATE TABLE IF NOT EXISTS support_tickets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    assunto VARCHAR(150),
    mensagem TEXT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('aberto','em_andamento','resolvido','fechado')) DEFAULT 'aberto',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Chat
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    ride_id BIGINT NOT NULL,
    remetente_id BIGINT NOT NULL,
    destinatario_id BIGINT NOT NULL,
    mensagem TEXT NOT NULL,
    enviado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
    FOREIGN KEY (remetente_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (destinatario_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    titulo VARCHAR(150),
    mensagem TEXT,
    lido BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver ON vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_passenger ON rides(passenger_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_update ON driver_locations(ultima_atualizacao);
