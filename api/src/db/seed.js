require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./connection');

async function seed() {
  try {
    console.log('🌱 Iniciando seed do usuário admin...');

    // Verificar se usuário já existe
    const checkUser = await pool.query(
      'SELECT id, email, senha FROM usuarios WHERE email = $1',
      ['admin@vendas.com']
    );

    if (checkUser.rows.length > 0) {
      const usuario = checkUser.rows[0];
      console.log('ℹ️  Usuário admin já existe (ID: ' + usuario.id + ')');

      // Testar se a senha atual funciona
      const senhaFunciona = await bcrypt.compare('admin123', usuario.senha);

      if (senhaFunciona) {
        console.log('✅ Senha do admin está correta. Nenhuma ação necessária.');
        process.exit(0);
      } else {
        console.log('⚠️  Senha do admin está incorreta. Atualizando...');

        // Atualizar apenas a senha
        const novaSenhaHash = await bcrypt.hash('admin123', 10);
        await pool.query(
          'UPDATE usuarios SET senha = $1 WHERE email = $2',
          [novaSenhaHash, 'admin@vendas.com']
        );

        console.log('✅ Senha do admin atualizada com sucesso!');
      }
    } else {
      console.log('❌ Usuário admin não existe. Criando...');

      // Criar hash da senha
      const senhaHash = await bcrypt.hash('admin123', 10);

      // Criar usuário admin
      await pool.query(
        'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3)',
        ['Admin', 'admin@vendas.com', senhaHash]
      );

      console.log('✅ Usuário admin criado com sucesso!');
    }

    console.log('');
    console.log('═══════════════════════════════════');
    console.log('📧 Email: admin@vendas.com');
    console.log('🔐 Senha: admin123');
    console.log('═══════════════════════════════════');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro no seed:', error);
    process.exit(1);
  }
}

seed();