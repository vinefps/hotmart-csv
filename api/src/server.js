require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// CORS COMPLETO E CORRETO
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : 'http://localhost:5173',
  credentials: true, // ← ESSENCIAL!
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // ← ADICIONA OPTIONS
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length'],
  maxAge: 600
};

app.use(cors(corsOptions));

// Handler explícito para preflight
app.options('*', cors(corsOptions));

app.use(express.json());

// Rotas
const authRoutes = require('./routes/authRoutes');
const vendasRoutes = require('./routes/vendasRoutes');
const adminRoutes = require('./routes/adminRoutes');
const hotmartRoutes = require('./routes/hotmartRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/vendas', vendasRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hotmart', hotmartRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'API de Vendas Hotmart - Rodando!',
    version: '1.0.0',
    endpoints: [
      '/api/auth',
      '/api/vendas',
      '/api/vendas/upload',
      '/api/hotmart/webhook',
      '/api/admin'
    ]
  });
});

// Health check com debug
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API funcionando',
    cors: {
      origin: process.env.FRONTEND_URL || 'not configured',
      nodeEnv: process.env.NODE_ENV || 'not configured',
      credentials: 'enabled'
    }
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 FRONTEND_URL: ${process.env.FRONTEND_URL || 'not configured'}`);
  console.log(`🔒 CORS Credentials: enabled`);
  console.log(`📤 Upload CSV: POST /api/vendas/upload`);
  console.log(`🔔 Webhook Hotmart: POST /api/hotmart/webhook`);
});

module.exports = app;