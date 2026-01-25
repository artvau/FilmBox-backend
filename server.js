require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { pool, initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// ==================== AUTH ROUTES ====================

// Регистрация
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Заполните все поля' });
  }

  // Валидация пароля
  if (password.length < 8) {
    return res.status(400).json({ error: 'Пароль должен содержать минимум 8 символов' });
  }
  if (!/[0-9]/.test(password)) {
    return res.status(400).json({ error: 'Пароль должен содержать минимум одну цифру' });
  }
  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({ error: 'Пароль должен содержать минимум одну заглавную букву' });
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return res.status(400).json({ error: 'Пароль должен содержать минимум один спец. символ' });
  }

  try {
    // Проверяем, существует ли пользователь
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 10);

    // Создаём пользователя
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email.toLowerCase(), passwordHash]
    );

    const user = result.rows[0];
    res.status(201).json({ 
      success: true, 
      user: { id: user.id, name: user.name, email: user.email } 
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вход
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Заполните все поля' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверные данные' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Неверные данные' });
    }

    res.json({ 
      success: true, 
      user: { id: user.id, name: user.name, email: user.email } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ==================== ORDERS ROUTES ====================

// Получить заказы пользователя
app.get('/api/orders/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json({ orders: result.rows });
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать заказ
app.post('/api/orders', async (req, res) => {
  const { userId, filmTitle, filmId, format, quantity, price, total } = req.body;

  if (!userId || !filmTitle || !format || !quantity || !price || !total) {
    return res.status(400).json({ error: 'Заполните все поля заказа' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO orders (user_id, film_title, film_id, format, quantity, price, total) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [userId, filmTitle, filmId, format, quantity, price, total]
    );

    res.status(201).json({ success: true, order: result.rows[0] });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== START SERVER ====================

async function start() {
  await initDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 FilmBox API running on port ${PORT}`);
  });
}

start();
