# Makefile для управления Docker контейнерами

.PHONY: help dev prod build up down logs clean test

# Переменные
DOCKER_DIR = docker
DOCKER_COMPOSE = docker-compose -f $(DOCKER_DIR)/docker-compose.yml
DOCKER_COMPOSE_DEV = $(DOCKER_COMPOSE) -f $(DOCKER_DIR)/docker-compose.dev.yml
DOCKER_COMPOSE_PROD = $(DOCKER_COMPOSE) -f $(DOCKER_DIR)/docker-compose.prod.yml

# Помощь
help:
	@echo "Доступные команды:"
	@echo "  make dev         - Запуск в режиме разработки"
	@echo "  make prod        - Запуск в production режиме"
	@echo "  make build       - Сборка Docker образов"
	@echo "  make up          - Запуск контейнеров"
	@echo "  make down        - Остановка контейнеров"
	@echo "  make logs        - Просмотр логов"
	@echo "  make clean       - Очистка данных и образов"
	@echo "  make test        - Запуск тестов"
	@echo "  make redis-cli   - Подключение к Redis CLI"
	@echo "  make shell       - Открыть shell в контейнере приложения"

# Разработка
dev: dev-down dev-up

dev-up:
	$(DOCKER_COMPOSE_DEV) up -d
	@echo "🚀 Сервисы запущены в режиме разработки"
	@echo "📍 Приложение: http://localhost:3000"
	@echo "📊 Bull Dashboard: http://localhost:3001"
	@echo "🔧 Redis Commander: http://localhost:8081"

dev-down:
	$(DOCKER_COMPOSE_DEV) down

dev-logs:
	$(DOCKER_COMPOSE_DEV) logs -f app-dev

dev-build:
	$(DOCKER_COMPOSE_DEV) build

# Production
prod: prod-build prod-up

prod-build:
	docker build -t proxy-queue-server:latest -f $(DOCKER_DIR)/Dockerfile .

prod-up:
	$(DOCKER_COMPOSE_PROD) up -d
	@echo "🚀 Production сервисы запущены"
	@echo "📍 Nginx: http://localhost"
	@echo "📊 Prometheus: http://localhost:9090"
	@echo "📈 Grafana: http://localhost:3002"

prod-down:
	$(DOCKER_COMPOSE_PROD) down

prod-logs:
	$(DOCKER_COMPOSE_PROD) logs -f proxy-server

# Общие команды
build:
	$(DOCKER_COMPOSE) build

up:
	$(DOCKER_COMPOSE) up -d redis bull-dashboard
	@echo "🚀 Базовые сервисы запущены"
	@echo "📍 Redis: localhost:6379"
	@echo "📊 Bull Dashboard: http://localhost:3001"

down:
	$(DOCKER_COMPOSE) down

logs:
	$(DOCKER_COMPOSE) logs -f

ps:
	$(DOCKER_COMPOSE) ps

# Утилиты
redis-cli:
	docker exec -it proxy-redis redis-cli

shell:
	docker exec -it proxy-server-dev /bin/sh

# Очистка
clean: down
	docker volume rm proxy-server_redis-data || true
	docker rmi proxy-queue-server:latest || true
	rm -rf data/

clean-all: clean
	docker system prune -af --volumes

# Тестирование
test:
	npm test

test-docker:
	docker run --rm -v $(PWD):/app -w /app node:18-alpine npm test

# Мониторинг
monitor:
	@echo "📊 Статистика очереди:"
	@curl -s http://localhost:3000/api/stats | jq '.'

health:
	@echo "🏥 Проверка здоровья:"
	@curl -s http://localhost:3000/health/detailed | jq '.'

# База данных
redis-backup:
	docker exec proxy-redis redis-cli BGSAVE
	mkdir -p backups
	docker cp proxy-redis:/data/dump.rdb backups/dump-$(shell date +%Y%m%d-%H%M%S).rdb
	@echo "✅ Backup создан в backups/"

redis-restore:
	@echo "Восстановление из последнего backup..."
	docker cp $(shell ls -t backups/dump-*.rdb | head -1) proxy-redis:/data/dump.rdb
	docker restart proxy-redis
	@echo "✅ Redis восстановлен"