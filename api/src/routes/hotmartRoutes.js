// ✅ ROTAS HOTMART ATUALIZADAS
const express = require('express');
const router = express.Router();
const hotmartController = require('../controllers/hotmartController');

// ===== WEBHOOK HOTMART =====

// Receber webhook da Hotmart (SEM autenticação JWT - usa validação HMAC)
// POST /api/hotmart/webhook
router.post('/webhook', hotmartController.receberWebhook);

// ===== ROTA DE TESTE (OPCIONAL) =====

// Testar webhook localmente sem precisar da Hotmart
// POST /api/hotmart/teste
// Em produção, você pode comentar esta rota
if (process.env.NODE_ENV === 'development') {
  router.post('/teste', hotmartController.testarWebhook);
}

module.exports = router;