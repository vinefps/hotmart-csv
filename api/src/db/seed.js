require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./connection');

async function seed() {
  try {
    console.log('🌱 Iniciando seed...');

    // Hash da senha
    const senhaHash = await bcrypt.hash('admin123', 10);

    // Verificar se usuário já existe
    const checkUser = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      ['admin@vendas.com']
    );

    if (checkUser.rows.length > 0) {
      console.log('ℹ️ Usuário admin já existe. Removendo...');

      // Apagar usuário existente
      await pool.query(
        'DELETE FROM usuarios WHERE email = $1',
        ['admin@vendas.com']
      );

      console.log('✅ Usuário admin removido');
    }

    // Criar usuário admin
    await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3)',
      ['Admin', 'admin@vendas.com', senhaHash]
    );

    console.log('✅ Usuário admin criado com sucesso!');
    console.log('📧 Email: admin@vendas.com');
    console.log('🔐 Senha: admin123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro no seed:', error);
    process.exit(1);
  }
}

seed();