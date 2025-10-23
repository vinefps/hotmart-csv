const express = require('express');
const router = express.Router();
const vendasController = require('../controllers/vendasController');
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middlewares/authMiddleware');

// Todas as rotas precisam de autenticação
router.use(authMiddleware);

// Upload CSV
router.post('/upload', uploadController.uploadCSV);

// CRUD de vendas
router.get('/', vendasController.listarVendas);
router.get('/estatisticas', vendasController.obterEstatisticas);
router.get('/:id', vendasController.buscarVendaPorId);
router.post('/', vendasController.criarVenda);
router.put('/:id', vendasController.atualizarVenda);
// ✅ SEM ROTA DELETE

module.exports = router;