const { Pool } = require('pg');

// Railway всегда использует SSL для PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // Таймауты для Railway
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
});

// Проверка подключения
pool.on('error', (err) => {
  console.error('Unexpected database error:', err.message);
});

// Инициализация таблиц
async function initDB() {
  let client;
  try {
    client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        film_title VARCHAR(255) NOT NULL,
        film_id INTEGER,
        format VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        price DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Database tables initialized');
    return true;
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    return false; // Не выбрасываем ошибку, просто возвращаем false
  } finally {
    if (client) client.release();
  }
}

module.exports = { pool, initDB };
