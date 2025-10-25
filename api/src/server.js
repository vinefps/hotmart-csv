require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// CORS COMPLETO E CORRETO
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-hotmart-hottok' // ← ADICIONA HEADER DO HOTMART
  ],
  exposedHeaders: ['Content-Length'],
  maxAge: 600
};

app.use(cors(corsOptions));

// Handler explícito para preflight
app.options('*', cors(corsOptions));

// ===== MIDDLEWARE JSON CONDICIONAL =====
// IMPORTANTE: Não processa JSON para o webhook do Hotmart
app.use((req, res, next) => {
  // Se for a rota do webhook, pula o JSON parser
  if (req.path === '/api/hotmart/webhook') {
    next();
  } else {
    // Para todas as outras rotas, usa JSON parser
    express.json()(req, res, next);
  }
});

// ===== MIDDLEWARE DE DEBUG (Desenvolvimento) =====
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    if (req.path === '/api/hotmart/webhook') {
      console.log('Headers:', req.headers);
      console.log('Hottok:', req.headers['x-hotmart-hottok']);
    }
    next();
  });
}

// ===== ROTAS =====
const authRoutes = require('./routes/authRoutes');
const vendasRoutes = require('./routes/vendasRoutes');
const adminRoutes = require('./routes/adminRoutes');
const hotmartRoutes = require('./routes/hotmartRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/vendas', vendasRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hotmart', hotmartRoutes);

// ===== ROTA RAIZ =====
app.get('/', (req, res) => {
  res.json({
    message: 'API de Vendas Hotmart - Rodando!',
    version: '1.0.0',
    endpoints: [
      '/api/auth',
      '/api/vendas',
      '/api/vendas/upload',
      '/api/hotmart/webhook',
      '/api/hotmart/teste', // ← Adiciona rota de teste
      '/api/admin'
    ],
    webhook: {
      status: 'configurado',
      endpoint: '/api/hotmart/webhook',
      method: 'POST',
      authentication: 'x-hotmart-hottok header'
    }
  });
});

// ===== HEALTH CHECK COM DEBUG =====
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API funcionando',
    cors: {
      origin: process.env.FRONTEND_URL || 'not configured',
      nodeEnv: process.env.NODE_ENV || 'not configured',
      credentials: 'enabled',
      hotmartHeader: 'x-hotmart-hottok permitido'
    },
    hotmart: {
      webhookConfigured: true,
      tokenConfigured: !!process.env.HOTMART_HOTTOK,
      tokenLength: process.env.HOTMART_HOTTOK ? process.env.HOTMART_HOTTOK.length : 0
    }
  });
});

// ===== ROTA DE TESTE DO WEBHOOK (Apenas Development) =====
if (process.env.NODE_ENV === 'development') {
  app.post('/api/webhook-test', express.json(), (req, res) => {
    console.log('🧪 Teste de Webhook');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);

    res.json({
      success: true,
      message: 'Teste recebido',
      headers: req.headers,
      body: req.body
    });
  });
}

// ===== TRATAMENTO DE ERROS GLOBAL =====
app.use((err, req, res, next) => {
  console.error('❌ Erro:', err);

  // Se for erro do webhook, ainda retorna 200 para evitar reenvio
  if (req.path === '/api/hotmart/webhook') {
    return res.status(200).json({
      success: false,
      message: 'Erro processado',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno'
    });
  }

  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ===== 404 HANDLER =====
app.use((req, res) => {
  res.status(404).json({
    error: true,
    message: `Rota não encontrada: ${req.method} ${req.path}`
  });
});

// ===== INICIAR SERVIDOR =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════');
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 FRONTEND_URL: ${process.env.FRONTEND_URL || 'not configured'}`);
  console.log(`🔒 CORS Credentials: enabled`);
  console.log('───────────────────────────────────────────────────');
  console.log('📍 Endpoints principais:');
  console.log(`   📤 Upload CSV: POST /api/vendas/upload`);
  console.log(`   🔔 Webhook Hotmart: POST /api/hotmart/webhook`);
  console.log(`   🧪 Teste Webhook: POST /api/hotmart/teste`);
  console.log('───────────────────────────────────────────────────');
  console.log('🔐 Configuração Hotmart:');
  console.log(`   Token configurado: ${process.env.HOTMART_HOTTOK ? '✅ Sim' : '❌ Não'}`);
  if (process.env.HOTMART_HOTTOK) {
    console.log(`   Token length: ${process.env.HOTMART_HOTTOK.length} caracteres`);
    console.log(`   Token preview: ${process.env.HOTMART_HOTTOK.substring(0, 10)}...`);
  }
  console.log('═══════════════════════════════════════════════════');
});

module.exports = app;