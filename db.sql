-- FilmBox PostgreSQL schema (2 tables)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Example queries:
-- Register: INSERT INTO users (name, email, password_hash) VALUES ('Neo', 'neo@matrix.io', '$2a$10$hash');
-- New order: INSERT INTO orders (user_id, film_title, film_id, format, quantity, price, total) VALUES (1, 'Inception', 27205, 'digital-4k', 1, 599, 599);
-- Fetch user orders: SELECT * FROM orders WHERE user_id = 1 ORDER BY created_at DESC;
-- Join: SELECT o.*, u.email, u.name FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC;
