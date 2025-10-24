-- ✅ SCHEMA ATUALIZADO COM PRODUTO E STATUS DE CANCELAMENTO

-- Deletar tabelas se existirem
DROP TABLE IF EXISTS vendas;
DROP TABLE IF EXISTS usuarios;

-- Tabela de usuários (autenticação)
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela principal de vendas com PRODUTO e STATUS
CREATE TABLE vendas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(50),
    produto VARCHAR(255),                     -- ✅ NOME DO PRODUTO
    tipo_pagamento VARCHAR(100),
    faturamento_liquido DECIMAL(10, 2),
    origem_checkout TEXT,
    status VARCHAR(50) DEFAULT 'aprovado',    -- ✅ STATUS: aprovado, cancelado, reembolso, chargeback
    data_cancelamento TIMESTAMP,              -- ✅ DATA DO CANCELAMENTO
    motivo_cancelamento TEXT,                 -- ✅ MOTIVO/OBSERVAÇÃO
    hotmart_transaction_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhorar performance
CREATE INDEX idx_nome ON vendas(nome);
CREATE INDEX idx_email ON vendas(email);
CREATE INDEX idx_telefone ON vendas(telefone);
CREATE INDEX idx_produto ON vendas(produto);           -- ✅ NOVO ÍNDICE
CREATE INDEX idx_status ON vendas(status);             -- ✅ NOVO ÍNDICE
CREATE INDEX idx_tipo_pagamento ON vendas(tipo_pagamento);
CREATE INDEX idx_faturamento ON vendas(faturamento_liquido);
CREATE INDEX idx_origem ON vendas(origem_checkout);
CREATE INDEX idx_hotmart_transaction ON vendas(hotmart_transaction_id);
CREATE INDEX idx_created_at ON vendas(created_at);     -- ✅ NOVO ÍNDICE

-- Inserir usuário padrão (senha: admin123 - DEVE SER HASHEADA EM PRODUÇÃO)
INSERT INTO usuarios (nome, email, senha) 
VALUES ('Admin', 'admin@vendas.com', '$2a$10$8K1p/a0dL3fzIm0Z9RqXkO7dX3aV5lG9pK8yE5hQf8xR6tN2mP3Ye');

-- View para vendas ativas (não canceladas)
CREATE VIEW vendas_ativas AS
SELECT * FROM vendas 
WHERE status = 'aprovado';

-- View para cancelamentos
CREATE VIEW vendas_canceladas AS
SELECT * FROM vendas 
WHERE status IN ('cancelado', 'reembolso', 'chargeback');