// api/src/server.js (ATUALIZADO COM CORS CORRIGIDO)
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const vendasRoutes = require('./routes/vendasRoutes');
const adminRoutes = require('./routes/adminRoutes');
const hotmartRoutes = require('./routes/hotmartRoutes');

const app = express();

// CORS configurado corretamente para produção
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://hotmart-csv.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-JSON'],
  maxAge: 600 // Cache preflight por 10 minutos
}));

// Middleware para responder preflight requests
app.options('*', cors());

app.use(express.json());

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/vendas', vendasRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hotmart', hotmartRoutes);

// Rota teste
app.get('/api', (req, res) => {
  res.json({
    message: 'API de Vendas',
    endpoints: [
      '/api/auth',
      '/api/vendas',
      '/api/vendas/upload',
      '/api/hotmart/webhook',
      '/api/admin'
    ]
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📤 Upload CSV: POST /api/vendas/upload`);
  console.log(`🔔 Webhook Hotmart: POST /api/hotmart/webhook`);
});

module.exports = app;