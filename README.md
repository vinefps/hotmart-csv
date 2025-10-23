# 💰 CRUD - Sistema de Gerenciamento de Vendas

Aplicação fullstack com upload de CSV e CRUD completo de vendas, usando React e Node.js com PostgreSQL.

## 📋 Descrição

Sistema para gerenciamento de vendas permitindo importação em massa via CSV e operações CRUD completas sobre os dados importados.

## 🚀 Tecnologias

**Backend:**
- Node.js + Express
- PostgreSQL
- JWT (autenticação)
- Multer (upload de arquivos)
- CSV Parser

**Frontend:**
- React
- Tailwind CSS
- Axios
- React Router

## 🎯 Funcionalidades

- ✅ Upload e importação de arquivo CSV
- ✅ CRUD completo de vendas
- ✅ Busca por nome, email ou tipo de pagamento
- ✅ Paginação de resultados
- ✅ Autenticação com login/senha
- ✅ Deletar todos os dados (admin)
- ✅ Estatísticas de vendas (total, faturamento, média)

## 📊 Campos Gerenciados

- **Nome**: Nome do cliente
- **Email**: Email do cliente
- **Telefone**: Telefone (DDD + Número)
- **Tipo de Pagamento**: Forma de pagamento utilizada
- **Faturamento Líquido**: Valor líquido da venda
- **Origem Checkout**: Origem da venda/checkout

## 🖥️ Como Executar Localmente

### Pré-requisitos
- Node.js 16+
- PostgreSQL 12+

### Backend

1. Entre na pasta do backend
```bash
cd api
```

2. Instale as dependências
```bash
npm install
```

3. Configure o arquivo `.env` (copie do `.env.example`)
```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=vendas
DB_PASSWORD=sua_senha
DB_PORT=5432
NODE_ENV=development
JWT_SECRET=seu_segredo_jwt_aqui
FRONTEND_URL=http://localhost:5173
PORT=5000
```

4. Crie o banco de dados e execute o schema
```bash
# Criar banco
psql -U postgres -c "CREATE DATABASE vendas;"

# Criar tabelas
psql -U postgres -d vendas -f src/db/schema.sql

# Criar usuário admin (senha: admin123)
node src/db/seed.js
```

5. Execute o servidor backend
```bash
npm run dev
```
O servidor estará rodando em http://localhost:5000

### Frontend

1. Abra um novo terminal e entre na pasta web
```bash
cd web
```

2. Instale as dependências
```bash
npm install
```

3. Configure o arquivo `.env`
```env
VITE_API_URL=http://localhost:5000/api
```

4. Execute o servidor de desenvolvimento
```bash
npm run dev
```
A aplicação estará rodando em http://localhost:5173

## 👤 Usuário de Teste

```
Email: admin@vendas.com
Senha: admin123
```

## 📝 Formato do CSV

O sistema aceita arquivos CSV com as seguintes colunas (separador `;`):

- Nome
- Email
- DDD
- Telefone
- Tipo de Pagamento
- Faturamento líquido
- Origem de Checkout

**Exemplo:**
```csv
Nome;Email;DDD;Telefone;Tipo de Pagamento;Faturamento líquido;Origem de Checkout
João Silva;joao@email.com;11;999999999;Cartão de Crédito;2500.00;Site
Maria Santos;maria@email.com;21;888888888;Pix;1800.50;WhatsApp
```

## 🔧 Estrutura do Projeto

```
crud-vendas/
├── api/                    # Backend
│   ├── src/
│   │   ├── controllers/   # Lógica de negócio
│   │   ├── db/           # Conexão e schema
│   │   ├── middlewares/  # Middlewares (auth)
│   │   ├── routes/       # Rotas da API
│   │   ├── uploads/      # Arquivos temporários
│   │   └── server.js     # Servidor Express
│   ├── .env.example
│   └── package.json
└── web/                   # Frontend
    ├── src/
    │   ├── components/   # Componentes React
    │   ├── pages/       # Páginas
    │   ├── services/    # API calls
    │   └── App.jsx      # App principal
    ├── .env.example
    └── package.json
```

## 📡 Endpoints da API

### Autenticação
- `POST /api/auth/login` - Fazer login
- `GET /api/auth/verificar` - Verificar token

### Vendas
- `GET /api/vendas` - Listar vendas (paginado)
- `GET /api/vendas/:id` - Buscar venda por ID
- `GET /api/vendas/estatisticas` - Obter estatísticas
- `POST /api/vendas` - Criar venda
- `POST /api/vendas/upload` - Upload de CSV
- `PUT /api/vendas/:id` - Atualizar venda
- `DELETE /api/vendas/:id` - Deletar venda

### Admin
- `DELETE /api/admin/deletar-todos` - Deletar todas as vendas

## 🚀 Deploy

### Backend (Railway/Heroku)
1. Configure as variáveis de ambiente
2. Conecte ao repositório Git
3. O deploy será automático

### Frontend (Vercel/Netlify)
1. Configure `VITE_API_URL` com a URL da API
2. Conecte ao repositório Git
3. O deploy será automático

## 📝 Licença

MIT

## 👨‍💻 Autor

Desenvolvido como sistema de gerenciamento de vendas
