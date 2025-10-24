-- ✅ SCHEMA REFATORADO - RECRIA TUDO SE EXISTIR (COM DEPENDÊNCIAS)

-- ============================================
-- PASSO 1: DROPAR VIEWS (sem CASCADE na view)
-- ============================================
DROP VIEW IF EXISTS vendas_canceladas;
DROP VIEW IF EXISTS vendas_ativas;

-- ============================================
-- PASSO 2: DROPAR TABELAS (com CASCADE para remover índices/constraints)
-- ============================================
DROP TABLE IF EXISTS vendas CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- ============================================
-- PASSO 3: CRIAR TABELAS DO ZERO
-- ============================================

-- Tabela de usuários (autenticação)
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE usuarios IS 'Tabela de usuários com autenticação do sistema';
COMMENT ON COLUMN usuarios.id IS 'ID único do usuário';
COMMENT ON COLUMN usuarios.email IS 'Email único para login';
COMMENT ON COLUMN usuarios.senha IS 'Senha hasheada (bcrypt)';

-- Tabela principal de vendas com PRODUTO e STATUS
CREATE TABLE vendas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(50),
    produto VARCHAR(255) NOT NULL,           -- ✅ NOME DO PRODUTO
    tipo_pagamento VARCHAR(100),
    faturamento_liquido DECIMAL(10, 2) DEFAULT 0,
    origem_checkout TEXT,
    status VARCHAR(50) DEFAULT 'aprovado',   -- ✅ STATUS: aprovado, cancelado, reembolso, chargeback
    data_cancelamento TIMESTAMP,             -- ✅ DATA DO CANCELAMENTO
    motivo_cancelamento TEXT,                -- ✅ MOTIVO/OBSERVAÇÃO
    hotmart_transaction_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE vendas IS 'Tabela principal com registros de vendas e cancelamentos';
COMMENT ON COLUMN vendas.produto IS 'Nome do produto vendido';
COMMENT ON COLUMN vendas.status IS 'Status da venda: aprovado, cancelado, reembolso, chargeback';
COMMENT ON COLUMN vendas.data_cancelamento IS 'Data/hora quando a venda foi cancelada';
COMMENT ON COLUMN vendas.motivo_cancelamento IS 'Motivo ou observação do cancelamento';

-- ============================================
-- PASSO 4: CRIAR ÍNDICES (melhoram performance)
-- ============================================

-- Índices principais (busca e filtro)
CREATE INDEX idx_vendas_nome ON vendas(nome);
CREATE INDEX idx_vendas_email ON vendas(email);
CREATE INDEX idx_vendas_telefone ON vendas(telefone);

-- Índices para produto e status (novos campos estratégicos)
CREATE INDEX idx_vendas_produto ON vendas(produto);
CREATE INDEX idx_vendas_status ON vendas(status);

-- Índices para relacionamentos e buscas comuns
CREATE INDEX idx_vendas_tipo_pagamento ON vendas(tipo_pagamento);
CREATE INDEX idx_vendas_faturamento ON vendas(faturamento_liquido);
CREATE INDEX idx_vendas_origem ON vendas(origem_checkout);
CREATE INDEX idx_vendas_hotmart_transaction ON vendas(hotmart_transaction_id);
CREATE INDEX idx_vendas_created_at ON vendas(created_at);

-- Índice composto para buscas de vendas canceladas (otimização)
CREATE INDEX idx_vendas_status_data ON vendas(status, data_cancelamento);

-- ============================================
-- PASSO 5: CRIAR VIEWS (relatórios)
-- ============================================

-- View para vendas ativas (não canceladas)
CREATE VIEW vendas_ativas AS
SELECT 
    id,
    nome,
    email,
    telefone,
    produto,
    tipo_pagamento,
    faturamento_liquido,
    origem_checkout,
    hotmart_transaction_id,
    created_at
FROM vendas 
WHERE status = 'aprovado'
ORDER BY created_at DESC;

COMMENT ON VIEW vendas_ativas IS 'Vendas aprovadas e ativas no sistema';

-- View para cancelamentos
CREATE VIEW vendas_canceladas AS
SELECT 
    id,
    nome,
    email,
    telefone,
    produto,
    tipo_pagamento,
    faturamento_liquido,
    status,
    data_cancelamento,
    motivo_cancelamento,
    hotmart_transaction_id,
    created_at
FROM vendas 
WHERE status IN ('cancelado', 'reembolso', 'chargeback')
ORDER BY data_cancelamento DESC;

COMMENT ON VIEW vendas_canceladas IS 'Vendas canceladas, reembolsadas ou com chargeback';

-- View de resumo de vendas por status
CREATE VIEW vendas_resumo_status AS
SELECT 
    status,
    COUNT(*) as total_vendas,
    SUM(faturamento_liquido) as faturamento_total,
    AVG(faturamento_liquido) as faturamento_medio
FROM vendas
GROUP BY status
ORDER BY total_vendas DESC;

COMMENT ON VIEW vendas_resumo_status IS 'Resumo de vendas agrupadas por status';

-- ============================================
-- PASSO 6: INSERIR DADOS INICIAIS
-- ============================================

-- Inserir usuário padrão
-- ⚠️ IMPORTANTE: Em PRODUÇÃO, usar senha hasheada!
-- Exemplo com bcrypt: npm install bcrypt
-- const hash = await bcrypt.hash('admin123', 10);
INSERT INTO usuarios (nome, email, senha) 
VALUES ('Admin', 'admin@vendas.com', '$2a$10$8K1p/a0dL3fzIm0Z9RqXkO7dX3aV5lG9pK8yE5hQf8xR6tN2mP3Ye')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- PASSO 7: TRIGGER PARA ATUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_updated_at_vendas ON vendas;
CREATE TRIGGER trigger_updated_at_vendas
    BEFORE UPDATE ON vendas
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_updated_at();

-- ============================================
-- PASSO 8: VALIDAÇÃO FINAL
-- ============================================

-- Verificar se tudo foi criado
SELECT 'Tabelas criadas com sucesso' as status;

-- Listar tabelas
\dt

-- Listar views
\dv

-- Listar índices
\di

-- Exibir estrutura da tabela vendas
\d vendas