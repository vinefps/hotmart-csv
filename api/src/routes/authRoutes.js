const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../middlewares/authMiddleware');

// Login
router.post('/login', AuthController.login);

// Verificar token
router.get('/verificar', authMiddleware, AuthController.verificarToken);

module.exports = router;
