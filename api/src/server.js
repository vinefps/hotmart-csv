require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
    endpoints: [
      '/api/auth',
      '/api/vendas',
      '/api/vendas/upload',
      '/api/hotmart/webhook',
      '/api/admin'
    ]
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

module.exports = app;