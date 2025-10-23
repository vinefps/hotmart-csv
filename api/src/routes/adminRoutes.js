const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');

// Todas as rotas precisam de autenticação
router.use(authMiddleware);

// Deletar todos os dados
router.delete('/deletar-todos', adminController.deletarTodos);

module.exports = router;
