// ✅ ROTAS HOTMART ATUALIZADAS
const express = require('express');
const router = express.Router();
const hotmartController = require('../controllers/hotmartController');

// ===== MIDDLEWARE PARA CAPTURAR BODY RAW =====
// CRÍTICO: O HMAC precisa ser calculado no body RAW, não no body parseado
const captureRawBody = (req, res, next) => {
  req.rawBody = '';
  req.setEncoding('utf8');

  req.on('data', (chunk) => {
    req.rawBody += chunk;
  });

  req.on('end', () => {
    next();
  });
};

// ===== WEBHOOK HOTMART =====

// Receber webhook da Hotmart (SEM autenticação JWT - usa validação HMAC)
// POST /api/hotmart/webhook
// IMPORTANTE: Usa express.raw() para preservar o body original
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  hotmartController.receberWebhook
);

// ===== ROTA DE TESTE (OPCIONAL) =====

// Testar webhook localmente sem precisar da Hotmart
// POST /api/hotmart/teste
// Em produção, você pode comentar esta rota
if (process.env.NODE_ENV === 'development') {
  router.post('/teste', hotmartController.testarWebhook);
}

module.exports = router;