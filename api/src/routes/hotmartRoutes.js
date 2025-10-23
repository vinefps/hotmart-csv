// api/src/routes/hotmartRoutes.js (NOVA - Webhook automático)
const express = require('express');
const router = express.Router();
const hotmartController = require('../controllers/hotmartController');

// WEBHOOK - NÃO PRECISA authMiddleware (Hotmart não tem seu token)
router.post('/webhook', hotmartController.receberWebhook);

// Rota de teste (opcional)
router.get('/status', (req, res) => {
  res.json({ status: 'Webhook ativo', timestamp: new Date() });
});

module.exports = router;