// api/src/db/connection.js (ATUALIZAR PARA RAILWAY)
const { Pool } = require('pg');
require('dotenv').config();

// Railway fornece DATABASE_URL completa
const connectionString = process.env.DATABASE_URL;

const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: {
          rejectUnauthorized: false // ← Importante para Railway
        }
      }
    : {
        // Fallback para ambiente local
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 5432,
      }
);

pool.on('connect', () => {
  console.log('✅ Conectado ao PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erro no PostgreSQL:', err.message);
});

module.exports = pool;