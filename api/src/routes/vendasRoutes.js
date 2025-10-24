// ✅ ROTAS DE VENDAS ATUALIZADAS
const express = require('express');
const router = express.Router();
const vendasController = require('../controllers/vendasController');
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middlewares/authMiddleware');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// ===== ROTAS DE LISTAGEM =====

// Listar TODAS as vendas (com filtro opcional de status)
// Query params: ?page=1&limit=20&search=termo&status=aprovado
router.get('/', vendasController.listarVendas);

// Listar SOMENTE vendas ativas (aprovadas)
// Query params: ?page=1&limit=20&search=termo
router.get('/ativas', vendasController.listarVendasAtivas);

// Listar SOMENTE cancelamentos (cancelado, reembolso, chargeback)
// Query params: ?page=1&limit=20&search=termo
router.get('/cancelamentos', vendasController.listarCancelamentos);

// Buscar venda específica por ID
router.get('/:id', vendasController.buscarVendaPorId);

// ===== ROTAS DE MODIFICAÇÃO =====

// Criar venda manualmente
router.post('/', vendasController.criarVenda);

// Atualizar venda
router.put('/:id', vendasController.atualizarVenda);

// Deletar venda (soft delete - marca como cancelado)
router.delete('/:id', vendasController.deletarVenda);

// ===== ROTAS DE UPLOAD =====

// Upload de CSV
router.post('/upload', uploadController.uploadCSV);

// Obter formato esperado do CSV
router.get('/upload/formato', uploadController.obterFormatoCSV);

// ===== ROTAS DE ESTATÍSTICAS =====

// Estatísticas gerais (vendas ativas vs cancelamentos)
router.get('/stats/geral', vendasController.obterEstatisticas);

// Estatísticas por período (últimos X dias)
// Query params: ?dias=30
router.get('/stats/periodo', vendasController.obterEstatisticasPeriodo);

module.exports = router;