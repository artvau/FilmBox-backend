# FilmBox Backend

Node.js + Express + PostgreSQL API для интернет-магазина фильмов.

## Локальный запуск

### 1. Установите зависимости
```bash
cd backend
npm install
```

### 2. Создайте файл .env
```bash
cp .env.example .env
```

### 3. Настройте переменные окружения
Отредактируйте `.env`:
```
DATABASE_URL=postgresql://username:password@localhost:5432/filmbox
PORT=3000
FRONTEND_URL=http://localhost:5500
```

### 4. Создайте базу данных PostgreSQL
```sql
CREATE DATABASE filmbox;
```

### 5. Запустите сервер
```bash
npm start
```

Сервер будет доступен на `http://localhost:3000`

## API Endpoints

### Авторизация

**POST /api/register** - Регистрация
```json
{
  "name": "Иван",
  "email": "ivan@example.com",
  "password": "MyPass123!"
}
```

**POST /api/login** - Вход
```json
{
  "email": "ivan@example.com",
  "password": "MyPass123!"
}
```

### Заказы

**GET /api/orders/:userId** - Получить заказы пользователя

**POST /api/orders** - Создать заказ
```json
{
  "userId": 1,
  "filmTitle": "Начало",
  "filmId": 27205,
  "format": "digital-4k",
  "quantity": 1,
  "price": 599,
  "total": 599
}
```

### Проверка

**GET /api/health** - Проверка работоспособности

## Деплой на Railway

1. Создайте проект на [Railway](https://railway.app)
2. Добавьте PostgreSQL из маркетплейса
3. Подключите GitHub репозиторий (папка backend)
4. Railway автоматически определит Node.js и запустит `npm start`
5. Переменные окружения будут настроены автоматически

### Настройка переменных на Railway
- `DATABASE_URL` - автоматически от PostgreSQL
- `FRONTEND_URL` - URL вашего GitHub Pages (например: `https://username.github.io/filmbox`)

## Структура базы данных

```sql
-- Пользователи
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Заказы
CREATE TABLE orders (
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
```

Таблицы создаются автоматически при первом запуске сервера.
