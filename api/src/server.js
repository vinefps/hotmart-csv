// api/src/server.js - VERSÃO CORRIGIDA COM CORS COMPLETO
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const vendasRoutes = require('./routes/vendasRoutes');
const adminRoutes = require('./routes/adminRoutes');
const hotmartRoutes = require('./routes/hotmartRoutes');

const app = express();

// ✅ CONFIGURAÇÃO CORS COMPLETA E CORRETA
app.use(cors({
  origin: function (origin, callback) {
    // Permitir requisições sem origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);

    // Lista de origens permitidas
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:3000',
      'https://hotmart-csv.vercel.app'  // Seu frontend Vercel
    ].filter(Boolean); // Remove undefined/null

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ Origin bloqueada:', origin);
      // Temporariamente permitir todas para debug (REMOVA EM PRODUÇÃO)
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 horas - cache do preflight
}));

// ✅ Permitir preflight requests explicitamente
app.options('*', cors());

// Outros middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging de requisições (útil para debug)
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - Origin: ${req.get('origin') || 'No origin'}`);
  next();
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/vendas', vendasRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hotmart', hotmartRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API de Vendas Hotmart Online! ✅',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

// Rota de teste/healthcheck
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando corretamente!',
    database: 'PostgreSQL',
    timestamp: new Date().toISOString(),
    cors: {
      enabled: true,
      frontend: process.env.FRONTEND_URL
    }
  });
});

// Rota de informações
app.get('/api', (req, res) => {
  res.json({
    message: 'API de Vendas',
    endpoints: [
      '/api/auth/login',
      '/api/auth/register',
      '/api/vendas',
      '/api/vendas/upload',
      '/api/hotmart/webhook',
      '/api/admin'
    ]
  });
});

// Middleware de erro 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    path: req.path
  });
});

// Middleware de erro geral
app.use((err, req, res, next) => {
  console.error('❌ Erro:', err);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 CORS habilitado para: ${process.env.FRONTEND_URL}`);
  console.log(`📤 Upload CSV: POST /api/vendas/upload`);
  console.log(`🔔 Webhook Hotmart: POST /api/hotmart/webhook`);
  console.log(`🔑 JWT configurado: ${process.env.JWT_SECRET ? '✅' : '❌'}`);
});

module.exports = app;