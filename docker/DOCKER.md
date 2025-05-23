# Docker Setup для Proxy Queue Server

## Быстрый старт

### Базовая настройка (только Redis)

```bash
# Запуск Redis и Bull Dashboard
docker-compose up -d

# Или с помощью Make
make up
```

### Режим разработки (с hot reload)

```bash
# Запуск всех сервисов для разработки
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Или с помощью Make
make dev
```

### Production режим

```bash
# Сборка и запуск
make prod

# Или вручную
docker build -t proxy-queue-server:latest .
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Доступные сервисы

### Development

- **Приложение**: http://localhost:3000
- **Bull Dashboard**: http://localhost:3001 (мониторинг очереди)
- **Redis Commander**: http://localhost:8081 (управление Redis)

### Production

- **Nginx (Load Balancer)**: http://localhost
- **Prometheus**: http://localhost:9090 (метрики)
- **Grafana**: http://localhost:3002 (визуализация)

## Полезные команды

### Просмотр логов

```bash
# Все сервисы
make logs

# Только приложение (dev)
make dev-logs

# Только приложение (prod)
make prod-logs
```

### Управление контейнерами

```bash
# Статус контейнеров
docker-compose ps

# Остановка
make down

# Полная очистка (включая volumes)
make clean
```

### Работа с Redis

```bash
# Redis CLI
make redis-cli

# Создание backup
make redis-backup

# Восстановление из backup
make redis-restore
```

### Мониторинг

```bash
# Статистика очереди
make monitor

# Health check
make health
```

## Конфигурация

### Environment переменные

Создайте `.env` файл в корне проекта:

```env
# Redis
REDIS_PASSWORD=strongpassword

# Target
TARGET_URL=https://srvchat.com

# Grafana
GRAFANA_USER=admin
GRAFANA_PASSWORD=secure_password
```

### Масштабирование

Для запуска нескольких экземпляров приложения:

```bash
docker-compose -f docker-compose.prod.yml up -d --scale proxy-server=3
```

## Структура файлов

```
.
├── docker-compose.yml           # Базовая конфигурация
├── docker-compose.dev.yml       # Дополнения для разработки
├── docker-compose.prod.yml      # Production конфигурация
├── Dockerfile                   # Production образ
├── Dockerfile.dev              # Development образ
├── Makefile                    # Удобные команды
├── nginx/
│   └── nginx.conf             # Конфигурация Nginx
└── monitoring/
    ├── prometheus.yml         # Конфигурация Prometheus
    └── grafana/              # Dashboards для Grafana
```

## Troubleshooting

### Redis не подключается

```bash
# Проверить статус
docker-compose ps redis

# Проверить логи
docker-compose logs redis

# Проверить сеть
docker network ls
```

### Приложение не запускается

```bash
# Проверить логи
docker-compose logs app-dev

# Войти в контейнер
docker exec -it proxy-server-dev sh

# Проверить переменные окружения
docker-compose config
```

### Очистка при проблемах

```bash
# Полная очистка и пересборка
make clean-all
make dev
```

## Best Practices

1. **Используйте .env файл** для sensitive данных
2. **Регулярно делайте backup Redis** в production
3. **Мониторьте метрики** через Prometheus/Grafana
4. **Используйте health checks** для автоматического перезапуска
5. **Ограничивайте ресурсы** контейнеров в production

## Дополнительные настройки

### SSL/TLS

Для включения HTTPS в production:

1. Поместите сертификаты в `nginx/ssl/`
2. Раскомментируйте HTTPS секцию в `nginx/nginx.conf`
3. Обновите docker-compose.prod.yml для монтирования сертификатов

### Мониторинг

Настройка Prometheus:

1. Создайте `monitoring/prometheus.yml`
2. Добавьте targets для сбора метрик
3. Импортируйте dashboards в Grafana