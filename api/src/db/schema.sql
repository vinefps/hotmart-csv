-- ✅ SCRIPT CORRETO COM TELEFONE INCLUÍDO

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

-- Tabela principal de vendas ✅ COM TELEFONE
CREATE TABLE vendas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(50),                    -- ✅ COLUNA ADICIONADA
    tipo_pagamento VARCHAR(100),
    faturamento_liquido DECIMAL(10, 2),
    origem_checkout TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Índices para melhorar performance
CREATE INDEX idx_nome ON vendas(nome);
CREATE INDEX idx_email ON vendas(email);
CREATE INDEX idx_telefone ON vendas(telefone);      -- ✅ ÍNDICE ADICIONADO
CREATE INDEX idx_tipo_pagamento ON vendas(tipo_pagamento);
CREATE INDEX idx_faturamento ON vendas(faturamento_liquido);
CREATE INDEX idx_origem ON vendas(origem_checkout); -- ✅ ÍNDICE ADICIONADO
CREATE INDEX IF NOT EXISTS idx_hotmart_transaction 
ON vendas(hotmart_transaction_id);

ALTER TABLE vendas 
ADD COLUMN IF NOT EXISTS hotmart_transaction_id VARCHAR(255) UNIQUE;

-- Inserir usuário padrão (senha: admin123)
INSERT INTO usuarios (nome, email, senha) 
VALUES ('Admin', 'admin@vendas.com', 'admin123');

-- ✅ Pronto! Agora a tabela tem a coluna telefone