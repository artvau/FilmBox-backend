require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'filmbox-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Токен действует 7 дней

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// ==================== JWT MIDDLEWARE ====================

// Middleware для проверки JWT токена
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Недействительный токен' });
    }
    req.user = user; // Добавляем данные пользователя в request
    next();
  });
}

// Функция создания JWT токена
function generateToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

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
    const token = generateToken(user);

    res.status(201).json({ 
      success: true,
      token,
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

    const token = generateToken(user);

    res.json({ 
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Проверка токена (для восстановления сессии)
app.get('/api/me', authenticateToken, (req, res) => {
  res.json({ 
    success: true, 
    user: req.user 
  });
});

// ==================== ORDERS ROUTES (Protected) ====================

// Получить заказы пользователя (защищено JWT)
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ orders: result.rows });
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать заказ (защищено JWT)
app.post('/api/orders', authenticateToken, async (req, res) => {
  const { filmTitle, filmId, format, quantity, price, total } = req.body;

  if (!filmTitle || !format || !quantity || !price || !total) {
    return res.status(400).json({ error: 'Заполните все поля заказа' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO orders (user_id, film_title, film_id, format, quantity, price, total) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [req.user.id, filmTitle, filmId, format, quantity, price, total]
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

// ==================== TMDB PROXY ====================
// Прокси для TMDB API (обход блокировки в России)

const TMDB_API_KEY = process.env.TMDB_API_KEY || '23fb77a6ffa48c52a48ba4daa9f2bd2e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Получить популярные фильмы
app.get('/api/movies/popular', async (req, res) => {
  const page = req.query.page || 1;
  const language = req.query.language || 'ru-RU';
  
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=${language}&page=${page}`
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('TMDB proxy error:', err);
    res.status(500).json({ error: 'Ошибка загрузки фильмов' });
  }
});

// Получить детали фильма
app.get('/api/movies/:id', async (req, res) => {
  const { id } = req.params;
  const language = req.query.language || 'ru-RU';
  
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&language=${language}`
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('TMDB proxy error:', err);
    res.status(500).json({ error: 'Ошибка загрузки фильма' });
  }
});

// ==================== START SERVER ====================

async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`🚀 FilmBox API running on port ${PORT}`);
  });
}

start();
