# Docker Setup для Proxy Queue Server

## Структура директории Docker

```
docker/
├── docker-compose.dev.yml       # Полная конфигурация для разработки
├── docker-compose.prod.yml      # Полная конфигурация для production
├── Dockerfile                   # Production образ
├── Dockerfile.dev              # Development образ
├── nginx/
│   ├── nginx.conf             # Конфигурация Nginx
│   └── ssl/                   # SSL сертификаты (создать при необходимости)
├── monitoring/
│   ├── prometheus.yml         # Конфигурация Prometheus
│   └── grafana/              # Dashboards для Grafana
└── README.md                  # Эта документация
```

## Быстрый старт

Все команды выполняются из **корневой директории проекта** (не из директории docker).

### Режим разработки (с hot reload)

```bash
# Из корня проекта
make dev

# Или напрямую
docker-compose -f docker/docker-compose.dev.yml up -d
```

### Production режим

```bash
# Из корня проекта
make prod

# Или пошагово
docker build -t proxy-queue-server:latest -f docker/Dockerfile .
docker-compose -f docker/docker-compose.prod.yml up -d
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

Все команды выполняются из корня проекта:

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
make ps

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

Создайте `.env` файл в **корне проекта** (не в docker/):

```env
# Redis
REDIS_PASSWORD=strongpassword

# Target
TARGET_URL=https://srvchat.com

# Grafana
GRAFANA_USER=admin
GRAFANA_PASSWORD=secure_password
```

### Дополнительные конфигурации

#### Prometheus (docker/monitoring/prometheus.yml)

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'proxy-server'
    static_configs:
      - targets: ['proxy-server:3000']
    metrics_path: '/metrics'

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
    metrics_path: '/metrics'
```

#### Nginx SSL (docker/nginx/ssl/)

Для включения HTTPS:

1. Создайте директорию `docker/nginx/ssl/`
2. Поместите туда сертификаты:
   - `cert.pem` - сертификат
   - `key.pem` - приватный ключ
3. Раскомментируйте HTTPS секцию в `docker/nginx/nginx.conf`

### Масштабирование

Для запуска нескольких экземпляров приложения:

```bash
docker-compose -f docker/docker-compose.prod.yml up -d --scale proxy-server=3
```

## Troubleshooting

### Redis не подключается

```bash
# Проверить статус
docker-compose -f docker/docker-compose.yml ps redis

# Проверить логи
docker-compose -f docker/docker-compose.yml logs redis

# Проверить сеть
docker network ls | grep proxy
```

### Приложение не запускается

```bash
# Проверить логи
make dev-logs

# Войти в контейнер
make shell

# Проверить переменные окружения
docker-compose -f docker/docker-compose.dev.yml config
```

### Ошибки сборки

```bash
# Проверить контекст сборки (должен быть корень проекта)
pwd  # должно показать корень проекта, не docker/

# Пересборка с нуля
make clean-all
make dev
```

## Best Practices

1. **Всегда запускайте команды из корня проекта**
2. **Используйте Makefile** для удобства
3. **Храните sensitive данные в .env файле**
4. **Регулярно делайте backup Redis** в production
5. **Мониторьте метрики** через Prometheus/Grafana
6. **Используйте health checks** для автоматического перезапуска

## Структура проекта с Docker

```
proxy-server/
├── src/                    # Исходный код
├── tests/                  # Тесты
├── docker/                 # Docker конфигурации
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   ├── docker-compose.prod.yml
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── nginx/
│   └── monitoring/
├── .env                    # Переменные окружения
├── .dockerignore          # Исключения для Docker
├── Makefile               # Команды
├── package.json
└── tsconfig.json
```

## Миграция с предыдущей версии

Если у вас были Docker файлы в корне проекта:

1. Переместите все docker-compose файлы в `docker/`
2. Переместите Dockerfile файлы в `docker/`
3. Обновите пути в Makefile (уже сделано)
4. Удалите старые файлы из корня

## Дополнительные возможности

### Grafana Dashboards

Импортируйте готовые dashboards:

1. Откройте Grafana: http://localhost:3002
2. Войдите (admin/admin по умолчанию)
3. Import → Upload JSON file
4. Используйте dashboards из `docker/monitoring/grafana/`

### Custom метрики

Для добавления своих метрик:

1. Обновите `src/routes/health.routes.ts`
2. Добавьте endpoint для Prometheus
3. Обновите `docker/monitoring/prometheus.yml`