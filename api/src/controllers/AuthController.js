const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/connection');

exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    console.log('🔐 Tentativa de login:', { email, senhaRecebida: senha ? '***' : 'vazio' });

    if (!email || !senha) {
      console.log('❌ Email ou senha não fornecidos');
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios'
      });
    }

    // Buscar usuário
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );

    console.log('👤 Usuários encontrados:', result.rows.length);

    if (result.rows.length === 0) {
      console.log('❌ Usuário não encontrado:', email);
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    const usuario = result.rows[0];
    console.log('✅ Usuário encontrado:', { id: usuario.id, email: usuario.email, nome: usuario.nome });
    console.log('🔑 Hash armazenado:', usuario.senha ? `${usuario.senha.substring(0, 20)}...` : 'vazio');

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    console.log('🔐 Resultado da comparação:', senhaValida ? '✅ Senha válida' : '❌ Senha inválida');

    if (!senhaValida) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    // Gerar token
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email
        }
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao realizar login'
    });
  }
};

exports.verificarToken = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nome, email FROM usuarios WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar token'
    });
  }
};
