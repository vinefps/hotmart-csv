// routes/hotmart.js
const express = require('express');
const router = express.Router();
const hotmartController = require('../controllers/hotmartController');

// ===== WEBHOOK HOTMART =====
// Usar express.raw() para capturar o body como Buffer
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  hotmartController.receberWebhook
);

// ===== ROTA DE TESTE (Development apenas) =====
if (process.env.NODE_ENV === 'development') {
  router.post('/teste', 
    express.json(), // Para teste, pode usar JSON normal
    hotmartController.testarWebhook
  );
}

module.exports = router;