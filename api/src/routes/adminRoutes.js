const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');

// ========================================
// ROTAS PÚBLICAS (SEM AUTENTICAÇÃO)
// ========================================
// Verificar usuários - útil para debug
router.get('/usuarios', adminController.verificarUsuarios);

// Corrigir usuário admin - útil quando há problema de login
router.post('/corrigir-admin', adminController.corrigirAdmin);

// ========================================
// ROTAS PROTEGIDAS (COM AUTENTICAÇÃO)
// ========================================
// Deletar todos os dados
router.delete('/deletar-todos', authMiddleware, adminController.deletarTodos);

module.exports = router;
