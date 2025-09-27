-- Full schema for meu_app_flash / railway

-- Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    tipo VARCHAR(20) DEFAULT 'passageiro',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Motoristas (extra info linked to usuarios)
CREATE TABLE IF NOT EXISTS motoristas (
    id SERIAL PRIMARY KEY,
    usuario_id INT UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    carro_modelo VARCHAR(100),
    carro_placa VARCHAR(20),
    cnh VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Corridas
CREATE TABLE IF NOT EXISTS corridas (
    id SERIAL PRIMARY KEY,
    passageiro_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    motorista_id INT REFERENCES motoristas(id) ON DELETE SET NULL,
    origem VARCHAR(255) NOT NULL,
    destino VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'solicitada',
    preco NUMERIC(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pagamentos
CREATE TABLE IF NOT EXISTS pagamentos (
    id SERIAL PRIMARY KEY,
    corrida_id INT REFERENCES corridas(id) ON DELETE CASCADE,
    passageiro_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    motorista_id INT REFERENCES motoristas(id) ON DELETE SET NULL,
    valor NUMERIC(10,2) NOT NULL,
    metodo VARCHAR(50) NOT NULL, -- pix | credito | debito | voucher
    status VARCHAR(50) DEFAULT 'pendente', -- pendente | pago | falhou | estornado
    transacao_id VARCHAR(255),
    provider VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vouchers
CREATE TABLE IF NOT EXISTS vouchers (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Avaliacoes
CREATE TABLE IF NOT EXISTS avaliacoes (
    id SERIAL PRIMARY KEY,
    corrida_id INT REFERENCES corridas(id) ON DELETE CASCADE,
    avaliador_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    avaliado_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    nota INT CHECK (nota >= 1 AND nota <= 5),
    comentario TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_corridas_passageiro ON corridas(passageiro_id);
CREATE INDEX IF NOT EXISTS idx_corridas_motorista ON corridas(motorista_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_corrida ON pagamentos(corrida_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_avaliado ON avaliacoes(avaliado_id);
