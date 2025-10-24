// api/src/server.js (ATUALIZAR)
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const vendasRoutes = require('./routes/vendasRoutes');
const adminRoutes = require('./routes/adminRoutes');
const hotmartRoutes = require('./routes/hotmartRoutes'); // ← NOVO

const app = express();

// Configuração CORS mais robusta
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'https://hotmart-csv.vercel.app',
  process.env.FRONTEND_URL,
  process.env.RAILWAY_STATIC_URL ? `https://${process.env.RAILWAY_STATIC_URL}` : null
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    console.log('🔍 CORS Request from origin:', origin); // Log para debug

    // Permite requisições sem origin (mobile apps, Postman, etc)
    if (!origin) {
      console.log('✅ Allowing request without origin');
      return callback(null, true);
    }

    // Permite todas as origens em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Allowing origin (development mode):', origin);
      return callback(null, true);
    }

    // Permite domínios Vercel (*.vercel.app)
    if (origin.includes('vercel.app')) {
      console.log('✅ Allowing Vercel origin:', origin);
      return callback(null, true);
    }

    // Permite domínios Railway (*.railway.app)
    if (origin.includes('railway.app')) {
      console.log('✅ Allowing Railway origin:', origin);
      return callback(null, true);
    }

    // Verifica se a origem está na lista de permitidas
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ Allowing whitelisted origin:', origin);
      callback(null, true);
    } else {
      console.log('❌ Blocking origin:', origin);
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600, // 10 minutos
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

// Middleware adicional para tratar OPTIONS requests
app.options('*', cors(corsOptions));

// Middleware para logging de requisições (útil para debug)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/vendas', vendasRoutes);      // ← Upload CSV continua aqui
app.use('/api/admin', adminRoutes);
app.use('/api/hotmart', hotmartRoutes);    // ← Nova rota webhook

// Rota teste
app.get('/api', (req, res) => {
  res.json({ 
    message: 'API de Vendas', 
    endpoints: [
      '/api/auth',
      '/api/vendas',
      '/api/vendas/upload',  // ← Upload manual
      '/api/hotmart/webhook', // ← Webhook automático
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