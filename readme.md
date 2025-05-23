# Proxy Queue Server

Прокси-сервер с очередью запросов и ограничением частоты для защиты целевого сервера от перегрузки.

## Основные возможности

- ✅ Очередь запросов на базе Redis (Bull)
- ✅ Rate limiting (минимум 0.5 сек между запросами)
- ✅ Асинхронная обработка с возможностью отслеживания статуса
- ✅ Retry механизм с exponential backoff
- ✅ Graceful shutdown
- ✅ Health checks и метрики
- ✅ TypeScript
- ✅ Логирование (Winston)
- ✅ Docker поддержка

## Требования

- Node.js >= 16
- Redis >= 6
- npm или yarn

## Установка

```bash
# Клонирование репозитория
git clone <repository-url>
cd proxy-server

# Установка зависимостей
npm install

# Копирование конфигурации
cp .env.example .env

# Редактирование конфигурации
nano .env
```

## Запуск

### Разработка

```bash
# Запуск Redis через Docker
npm run redis:start

# Запуск сервера в режиме разработки
npm run dev
```

### Production

```bash
# Сборка
npm run build

# Запуск
npm start
```

### Docker

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f proxy-server
```

## API Endpoints

### 1. Добавление запроса в очередь

```bash
POST /api/proxy/*

# Пример:
curl -X POST http://localhost:3000/api/proxy/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe"}'

# Ответ:
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Request queued successfully",
  "checkStatusUrl": "/status/550e8400-e29b-41d4-a716-446655440000",
  "estimatedWaitTime": 1500
}
```

### 2. Проверка статуса задачи

```bash
GET /api/status/:jobId

# Пример:
curl http://localhost:3000/api/status/550e8400-e29b-41d4-a716-446655440000

# Ответ (в процессе):
{
  "success": true,
  "status": "processing",
  "position": null,
  "metadata": {
    "createdAt": "2024-01-01T12:00:00.000Z",
    "attempts": 1
  }
}

# Ответ (завершено):
{
  "success": true,
  "status": "completed",
  "result": {
    "status": 200,
    "headers": {...},
    "data": {...}
  },
  "metadata": {
    "duration": 1234,
    "completedAt": "2024-01-01T12:00:01.234Z"
  }
}
```

### 3. Получение результата

```bash
GET /api/result/:jobId

# Возвращает оригинальный ответ от целевого сервера
```

### 4. Отмена задачи

```bash
DELETE /api/jobs/:jobId
```

### 5. Статистика очереди

```bash
GET /api/stats

# Ответ:
{
  "success": true,
  "stats": {
    "waiting": 5,
    "active": 1,
    "completed": 100,
    "failed": 2,
    "delayed": 0
  },
  "config": {
    "maxQueueSize": 1000,
    "rateLimit": 500,
    "maxConcurrent": 1
  }
}
```

### 6. Health Checks

```bash
# Простая проверка
GET /health

# Детальная проверка
GET /health/detailed

# Готовность к приему трафика
GET /health/ready
```

## Конфигурация

### Основные переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `PORT` | Порт сервера | 3000 |
| `REDIS_URL` | URL подключения к Redis | redis://localhost:6379 |
| `TARGET_URL` | URL целевого сервера | https://srvchat.com |
| `RATE_LIMIT_MIN_TIME` | Мин. время между запросами (мс) | 500 |
| `QUEUE_MAX_SIZE` | Макс. размер очереди | 1000 |
| `JOB_TIMEOUT` | Таймаут задачи (мс) | 60000 |

### Полный список в `.env.example`

## Архитектура

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Clients   │────▶│ Proxy Server │────▶│    Redis    │
└─────────────┘     └──────────────┘     └─────────────┘
                            │                     │
                            ▼                     ▼
                    ┌──────────────┐     ┌─────────────┐
                    │ Rate Limiter │────▶│ Target API  │
                    └──────────────┘     └─────────────┘
```

## Мониторинг

### Bull Dashboard

Для мониторинга очереди доступен Bull Dashboard:

```bash
# Запускается автоматически с docker-compose
# Доступен по адресу: http://localhost:3001
```

### Логи

- Development: цветной вывод в консоль
- Production: JSON логи в файлы
    - `logs/combined.log` - все логи
    - `logs/error.log` - только ошибки
    - `logs/exceptions.log` - необработанные исключения

## Разработка

### Структура проекта

```
src/
├── config/           # Конфигурация
├── controllers/      # HTTP контроллеры
├── middlewares/      # Express middleware
├── services/         # Бизнес-логика
│   ├── queue/       # Сервисы очереди
│   └── cache/       # Кеширование
├── models/          # TypeScript интерфейсы
├── routes/          # Маршруты API
├── utils/           # Утилиты
├── types/           # Типы TypeScript
├── app.ts           # Express приложение
└── server.ts        # Точка входа
```

### Тестирование

```bash
# Запуск тестов
npm test

# Запуск с покрытием
npm run test:coverage

# Запуск в watch режиме
npm run test:watch
```

### Линтинг

```bash
# Проверка кода
npm run lint

# Автоматическое исправление
npm run lint:fix
```

## Производительность

- Обработка: ~2 запроса/сек (при rate limit 500мс)
- Максимальная очередь: 1000 задач
- Таймаут задачи: 60 секунд
- Retry: 3 попытки с exponential backoff

## Безопасность

- Helmet для защиты заголовков
- CORS настройки
- Rate limiting
- Валидация входных данных
- Graceful shutdown

## Решение проблем

### Redis не подключается

```bash
# Проверить статус Redis
redis-cli ping

# Проверить URL в .env
REDIS_URL=redis://localhost:6379
```

### Очередь переполнена

```bash
# Увеличить размер очереди
QUEUE_MAX_SIZE=5000

# Или очистить старые задачи
curl -X POST http://localhost:3000/api/admin/cleanup
```

### Высокая нагрузка на память

```bash
# Уменьшить TTL результатов
CACHE_TTL=60

# Уменьшить интервал очистки
CLEANUP_INTERVAL=60000
```

## Лицензия

MIT