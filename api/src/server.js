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

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

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