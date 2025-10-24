require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./connection');

async function fixAdmin() {
  try {
    console.log('🔧 Verificando e corrigindo usuário admin...\n');

    // Listar todos os usuários
    const allUsers = await pool.query('SELECT id, nome, email, created_at FROM usuarios');
    console.log(`📋 Total de usuários no banco: ${allUsers.rows.length}\n`);

    if (allUsers.rows.length > 0) {
      console.log('Usuários cadastrados:');
      allUsers.rows.forEach(u => {
        console.log(`  - ID: ${u.id} | Email: ${u.email} | Nome: ${u.nome}`);
      });
      console.log('');
    }

    // Verificar se usuário admin existe
    const checkUser = await pool.query(
      'SELECT id, email, senha FROM usuarios WHERE email = $1',
      ['admin@vendas.com']
    );

    if (checkUser.rows.length > 0) {
      const usuario = checkUser.rows[0];
      console.log('✅ Usuário admin encontrado!');
      console.log(`   ID: ${usuario.id}`);
      console.log(`   Email: ${usuario.email}`);
      console.log(`   Hash da senha: ${usuario.senha.substring(0, 30)}...`);
      console.log('');

      // Testar se a senha "admin123" funciona com o hash atual
      const senhaAtualFunciona = await bcrypt.compare('admin123', usuario.senha);
      console.log(`🔐 Teste da senha "admin123": ${senhaAtualFunciona ? '✅ FUNCIONA' : '❌ NÃO FUNCIONA'}`);

      if (!senhaAtualFunciona) {
        console.log('\n⚠️  A senha no banco não corresponde a "admin123"');
        console.log('🔄 Recriando usuário admin com senha correta...\n');

        // Deletar usuário existente
        await pool.query('DELETE FROM usuarios WHERE email = $1', ['admin@vendas.com']);

        // Criar novo hash
        const novoHash = await bcrypt.hash('admin123', 10);

        // Criar usuário novamente
        await pool.query(
          'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3)',
          ['Admin', 'admin@vendas.com', novoHash]
        );

        console.log('✅ Usuário admin recriado com sucesso!');
        console.log('📧 Email: admin@vendas.com');
        console.log('🔐 Senha: admin123');
        console.log(`🔑 Novo hash: ${novoHash.substring(0, 30)}...`);

        // Verificar novamente
        const verificacao = await bcrypt.compare('admin123', novoHash);
        console.log(`\n✓ Verificação: ${verificacao ? '✅ Hash válido' : '❌ Erro no hash'}`);
      } else {
        console.log('\n✅ Senha já está correta! Login deve funcionar com:');
        console.log('   Email: admin@vendas.com');
        console.log('   Senha: admin123');
      }
    } else {
      console.log('❌ Usuário admin não encontrado. Criando...\n');

      // Criar hash da senha
      const senhaHash = await bcrypt.hash('admin123', 10);

      // Criar usuário admin
      await pool.query(
        'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3)',
        ['Admin', 'admin@vendas.com', senhaHash]
      );

      console.log('✅ Usuário admin criado com sucesso!');
      console.log('📧 Email: admin@vendas.com');
      console.log('🔐 Senha: admin123');
      console.log(`🔑 Hash: ${senhaHash.substring(0, 30)}...`);

      // Verificar
      const verificacao = await bcrypt.compare('admin123', senhaHash);
      console.log(`\n✓ Verificação: ${verificacao ? '✅ Hash válido' : '❌ Erro no hash'}`);
    }

    console.log('\n✅ Processo concluído!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro ao corrigir admin:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

fixAdmin();
