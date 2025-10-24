const bcrypt = require('bcryptjs');
const pool = require('../db/connection');

exports.deletarTodos = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM vendas');

    res.json({
      success: true,
      message: 'Todos os dados foram deletados',
      data: {
        deletados: result.rowCount
      }
    });
  } catch (error) {
    console.error('Erro ao deletar todos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar dados'
    });
  }
};

exports.verificarUsuarios = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome, email, created_at FROM usuarios ORDER BY id');

    res.json({
      success: true,
      total: result.rows.length,
      usuarios: result.rows
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar usuários'
    });
  }
};

exports.corrigirAdmin = async (req, res) => {
  try {
    console.log('🔧 Iniciando correção do usuário admin...');

    // Verificar se usuário admin existe
    const checkUser = await pool.query(
      'SELECT id, email, senha FROM usuarios WHERE email = $1',
      ['admin@vendas.com']
    );

    let mensagem = '';
    let usuarioRecriado = false;

    if (checkUser.rows.length > 0) {
      const usuario = checkUser.rows[0];
      console.log('✅ Usuário admin encontrado:', usuario.email);

      // Testar se a senha "admin123" funciona
      const senhaAtualFunciona = await bcrypt.compare('admin123', usuario.senha);
      console.log('🔐 Senha atual funciona:', senhaAtualFunciona);

      if (!senhaAtualFunciona) {
        console.log('⚠️  Senha incorreta. Recriando usuário...');

        // Deletar usuário existente
        await pool.query('DELETE FROM usuarios WHERE email = $1', ['admin@vendas.com']);

        // Criar novo hash
        const novoHash = await bcrypt.hash('admin123', 10);

        // Criar usuário novamente
        await pool.query(
          'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3)',
          ['Admin', 'admin@vendas.com', novoHash]
        );

        mensagem = 'Usuário admin recriado com senha corrigida';
        usuarioRecriado = true;
      } else {
        mensagem = 'Usuário admin já existe com senha correta';
      }
    } else {
      console.log('❌ Usuário admin não encontrado. Criando...');

      // Criar hash da senha
      const senhaHash = await bcrypt.hash('admin123', 10);

      // Criar usuário admin
      await pool.query(
        'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3)',
        ['Admin', 'admin@vendas.com', senhaHash]
      );

      mensagem = 'Usuário admin criado com sucesso';
      usuarioRecriado = true;
    }

    console.log('✅ Correção concluída:', mensagem);

    res.json({
      success: true,
      message: mensagem,
      usuarioRecriado,
      credenciais: {
        email: 'admin@vendas.com',
        senha: 'admin123'
      }
    });
  } catch (error) {
    console.error('❌ Erro ao corrigir admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao corrigir usuário admin',
      error: error.message
    });
  }
};
