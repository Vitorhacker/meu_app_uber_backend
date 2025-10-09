-- ===========================================
-- USUÁRIOS
-- ===========================================
CREATE TABLE IF NOT EXISTS usuarios (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    telefone VARCHAR(20) UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('passageiro', 'motorista', 'admin')) DEFAULT 'passageiro',
    foto_perfil TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_login TIMESTAMP NULL
);

-- 🔹 Criação da tabela agendar
CREATE TABLE IF NOT EXISTS agendar (
    agenda_id SERIAL PRIMARY KEY,
    origem_cidade VARCHAR(255) NOT NULL,
    origem_endereco VARCHAR(255),
    destino_cidade VARCHAR(255) NOT NULL,
    destino_endereco VARCHAR(255),
    quando TIMESTAMP NOT NULL,
    passageiros INT NOT NULL,
    tarifa_sugerida NUMERIC(10,2),
    valor_estimado NUMERIC(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pendente',
    motorista_id INT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 🔹 Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 🔹 Trigger que atualiza updated_at a cada UPDATE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'trigger_update_agendar_updated_at'
    ) THEN
        CREATE TRIGGER trigger_update_agendar_updated_at
        BEFORE UPDATE ON agendar
        FOR EACH ROW
        EXECUTE FUNCTION atualizar_updated_at();
    END IF;
END $$;


-- Motoristas
CREATE TABLE IF NOT EXISTS motoristas (
    id BIGINT PRIMARY KEY,
    cnh_numero VARCHAR(30),
    cnh_validade DATE,
    status_verificacao VARCHAR(20) CHECK (status_verificacao IN ('pendente','aprovado','rejeitado')) DEFAULT 'pendente',
    avaliacao_media DECIMAL(3,2) DEFAULT 0,
    FOREIGN KEY (id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Passageiros
CREATE TABLE IF NOT EXISTS passageiros (
    id BIGINT PRIMARY KEY,
    metodo_pagamento_preferido VARCHAR(20) CHECK (metodo_pagamento_preferido IN ('pix','cartao','carteira','dinheiro')),
    FOREIGN KEY (id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Veículos
CREATE TABLE IF NOT EXISTS veiculos (
    id BIGSERIAL PRIMARY KEY,
    motorista_id BIGINT NOT NULL,
    marca VARCHAR(50),
    modelo VARCHAR(50),
    ano INT,
    placa VARCHAR(20) UNIQUE,
    categoria VARCHAR(20) CHECK (categoria IN ('flash','hatch','sedan','luxo','moto')) DEFAULT 'hatch',
    cor VARCHAR(30),
    status VARCHAR(20) CHECK (status IN ('ativo','inativo')) DEFAULT 'ativo',
    FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE CASCADE
);

-- ===========================================
-- CORRIDAS
-- ===========================================
CREATE TABLE IF NOT EXISTS corridas (
    id BIGSERIAL PRIMARY KEY,
    passageiro_id BIGINT NOT NULL,
    motorista_id BIGINT NULL,
    veiculo_id BIGINT,
    origem_lat DECIMAL(10,7),
    origem_lng DECIMAL(10,7),
    destino_lat DECIMAL(10,7),
    destino_lng DECIMAL(10,7),
    distancia_km DECIMAL(6,2),
    tempo_estimado_min INT,
    preco DECIMAL(10,2),
    forma_pagamento VARCHAR(20) CHECK (forma_pagamento IN ('pix','cartao','carteira','dinheiro')),
    status VARCHAR(20) CHECK (status IN ('solicitada','aceita','em_andamento','finalizada','cancelada')) DEFAULT 'solicitada',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finalizado_em TIMESTAMP NULL,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (passageiro_id) REFERENCES passageiros(id) ON DELETE CASCADE,
    FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE SET NULL,
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE SET NULL
);

-- ===========================================
-- PAGAMENTOS
-- ===========================================
CREATE TABLE IF NOT EXISTS pagamentos (
    id BIGSERIAL PRIMARY KEY,
    corrida_id BIGINT NOT NULL,
    passageiro_id BIGINT NOT NULL,
    motorista_id BIGINT NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    valor_motorista DECIMAL(10,2) NOT NULL,
    valor_plataforma DECIMAL(10,2) NOT NULL,
    metodo VARCHAR(20) CHECK (metodo IN ('pix','cartao','carteira','dinheiro')),
    status VARCHAR(20) CHECK (status IN ('pendente','pago','falhou','estornado','expirado','contestacao')) DEFAULT 'pendente',
    transacao_id VARCHAR(255),
    provider VARCHAR(50),
    data_pagamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (corrida_id) REFERENCES corridas(id) ON DELETE CASCADE,
    FOREIGN KEY (passageiro_id) REFERENCES passageiros(id) ON DELETE CASCADE,
    FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_corrida ON pagamentos(corrida_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_motorista ON pagamentos(motorista_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_passageiro ON pagamentos(passageiro_id);

-- ===========================================
-- AVALIAÇÕES
-- ===========================================
CREATE TABLE IF NOT EXISTS avaliacoes (
    id BIGSERIAL PRIMARY KEY,
    corrida_id BIGINT NOT NULL,
    avaliador_id BIGINT NOT NULL,
    avaliado_id BIGINT NOT NULL,
    nota INT CHECK (nota >= 1 AND nota <= 5),
    comentario TEXT,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (corrida_id) REFERENCES corridas(id) ON DELETE CASCADE,
    FOREIGN KEY (avaliador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (avaliado_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ===========================================
-- LOCALIZAÇÃO MOTORISTA
-- ===========================================
CREATE TABLE IF NOT EXISTS motorista_localizacoes (
    motorista_id BIGINT PRIMARY KEY,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    ultima_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE CASCADE
);

-- ===========================================
-- CATEGORIAS DE CORRIDA
-- ===========================================
CREATE TABLE IF NOT EXISTS categorias_corrida (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(50) UNIQUE,
    descricao TEXT,
    tarifa_base DECIMAL(10,2) DEFAULT 0,
    preco_por_km DECIMAL(10,2) DEFAULT 0,
    preco_por_min DECIMAL(10,2) DEFAULT 0
);

-- ===========================================
-- CARTEIRA E FINANCEIRO
-- ===========================================
CREATE TABLE IF NOT EXISTS carteiras (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL UNIQUE,
  saldo DECIMAL(14,2) NOT NULL DEFAULT 0,
  reservado DECIMAL(14,2) NOT NULL DEFAULT 0,
  moeda VARCHAR(3) DEFAULT 'BRL',
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_carteiras_usuario ON carteiras(usuario_id);

CREATE TABLE IF NOT EXISTS lancamentos (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL,
  tabela_relacionada VARCHAR(50),
  id_relacionado BIGINT,
  tipo VARCHAR(50) NOT NULL,
  valor DECIMAL(14,2) NOT NULL,
  saldo_resultante DECIMAL(14,2) NOT NULL,
  metadata JSONB,
  idempotency_key VARCHAR(128),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS solicitacoes_saque (
  id BIGSERIAL PRIMARY KEY,
  motorista_id BIGINT NOT NULL,
  valor DECIMAL(14,2) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('pendente','aprovado','rejeitado','processado')) DEFAULT 'pendente',
  solicitado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  aprovado_em TIMESTAMP,
  processado_em TIMESTAMP,
  FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE CASCADE
);

-- ===========================================
-- SUPORTE E COMUNICAÇÃO
-- ===========================================
CREATE TABLE IF NOT EXISTS chamados_suporte (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    assunto VARCHAR(150),
    mensagem TEXT NOT NULL,
    respostas JSONB DEFAULT '[]', -- histórico de respostas
    status VARCHAR(20) CHECK (status IN ('aberto','em_andamento','resolvido','fechado')) DEFAULT 'aberto',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mensagens_chat (
    id BIGSERIAL PRIMARY KEY,
    corrida_id BIGINT NOT NULL,
    remetente_id BIGINT NOT NULL,
    destinatario_id BIGINT NOT NULL,
    mensagem TEXT NOT NULL,
    enviado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (corrida_id) REFERENCES corridas(id) ON DELETE CASCADE,
    FOREIGN KEY (remetente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (destinatario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notificacoes (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    titulo VARCHAR(150),
    mensagem TEXT,
    lido BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_veiculos_motorista ON veiculos(motorista_id);
CREATE INDEX IF NOT EXISTS idx_corridas_passageiro ON corridas(passageiro_id);
CREATE INDEX IF NOT EXISTS idx_corridas_motorista ON corridas(motorista_id);
CREATE INDEX IF NOT EXISTS idx_localizacao_motorista ON motorista_localizacoes(ultima_atualizacao);
CREATE INDEX IF NOT EXISTS idx_chamados_usuario ON chamados_suporte(usuario_id);
CREATE INDEX IF NOT EXISTS idx_chat_corrida ON mensagens_chat(corrida_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id);
