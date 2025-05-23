# Инструкция по установке оставшихся файлов

Этот скрипт создал базовую структуру проекта.
Для полной установки вам нужно скопировать следующие файлы из артефактов:

## Файлы для копирования:

### src/services/queue/queue.types.ts
### src/services/queue/redis-queue.service.ts
### src/services/rate-limiter.service.ts
### src/services/http-client.service.ts
### src/controllers/proxy.controller.ts
### src/middlewares/error.middleware.ts
### src/middlewares/request-id.middleware.ts
### src/routes/proxy.routes.ts
### src/routes/health.routes.ts
### src/app.ts
### src/server.ts
### examples/client.js
### tests/setup.ts
### tests/unit/services/queue.service.test.ts
### scripts/quick-start.sh
### README.md

После копирования всех файлов:

1. npm install
2. cp .env.example .env
3. npm run redis:start
4. npm run dev

