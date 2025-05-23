# Структура проекта Proxy Queue Server

```
proxy-server/
├── src/                              # Исходный код приложения
│   ├── config/                       # Конфигурация
│   │   ├── index.ts                 # Основная конфигурация
│   │   ├── logger.ts                # Настройка логгера
│   │   └── redis.ts                 # Конфигурация Redis
│   │
│   ├── controllers/                  # HTTP контроллеры
│   │   ├── proxy.controller.ts      # Обработка запросов проксирования
│   │   └── health.controller.ts     # Health checks
│   │
│   ├── middlewares/                  # Express middleware
│   │   ├── error.middleware.ts      # Обработка ошибок
│   │   ├── validation.middleware.ts # Валидация запросов
│   │   └── request-id.middleware.ts # Генерация ID запросов
│   │
│   ├── services/                     # Бизнес-логика
│   │   ├── queue/                   # Сервисы очереди
│   │   │   ├── queue.service.ts    # Абстракция очереди
│   │   │   ├── redis-queue.service.ts # Redis реализация
│   │   │   └── queue.types.ts      # Типы для очереди
│   │   ├── cache/                   # Кеширование
│   │   │   └── redis-cache.service.ts
│   │   ├── rate-limiter.service.ts # Rate limiting
│   │   ├── proxy.service.ts         # Проксирование
│   │   └── http-client.service.ts   # HTTP клиент
│   │
│   ├── models/                       # Модели данных
│   │   ├── request.model.ts        # Интерфейсы запросов
│   │   └── queue-item.model.ts     # Модель элемента очереди
│   │
│   ├── routes/                       # API маршруты
│   │   ├── index.ts                 # Основной роутер
│   │   ├── proxy.routes.ts          # Роуты проксирования
│   │   └── health.routes.ts         # Служебные роуты
│   │
│   ├── utils/                        # Утилиты
│   │   ├── constants.ts             # Константы
│   │   ├── errors.ts                # Кастомные ошибки
│   │   └── helpers.ts               # Вспомогательные функции
│   │
│   ├── types/                        # TypeScript типы
│   │   ├── index.d.ts               # Общие типы
│   │   └── express.d.ts             # Расширение Express
│   │
│   ├── app.ts                        # Express приложение
│   └── server.ts                     # Точка входа
│
├── docker/                           # Docker конфигурации
│   ├── docker-compose.yml           # Базовая конфигурация
│   ├── docker-compose.dev.yml       # Development окружение
│   ├── docker-compose.prod.yml      # Production окружение
│   ├── Dockerfile                   # Production образ
│   ├── Dockerfile.dev              # Development образ
│   ├── nginx/                       # Nginx конфигурация
│   │   ├── nginx.conf              # Основная конфигурация
│   │   └── ssl/                    # SSL сертификаты
│   │       └── .gitkeep
│   ├── monitoring/                   # Мониторинг
│   │   ├── prometheus.yml          # Конфигурация Prometheus
│   │   └── grafana/                # Grafana настройки
│   │       ├── dashboards/         # JSON dashboards
│   │       │   └── proxy-queue-dashboard.json
│   │       └── provisioning/       # Автоматическая настройка
│   │           ├── datasources/
│   │           │   └── prometheus.yml
│   │           └── dashboards/
│   │               └── dashboard.yml
│   └── README.md                    # Docker документация
│
├── tests/                            # Тесты
│   ├── unit/                        # Unit тесты
│   │   ├── services/
│   │   │   └── queue.service.test.ts
│   │   └── utils/
│   ├── integration/                 # Интеграционные тесты
│   │   └── routes/
│   ├── fixtures/                    # Тестовые данные
│   └── setup.ts                     # Настройка тестов
│
├── scripts/                          # Вспомогательные скрипты
│   ├── quick-start.sh              # Быстрый старт
│   └── setup-docker.sh             # Настройка Docker
│
├── examples/                         # Примеры использования
│   └── client.js                    # Пример клиента
│
├── logs/                            # Директория для логов
│   └── .gitkeep
│
├── data/                            # Локальные данные (игнорируется git)
│   └── redis/
│
├── backups/                         # Резервные копии Redis
│   └── .gitkeep
│
├── .env.example                     # Пример переменных окружения
├── .env                            # Локальные переменные (в .gitignore)
├── .gitignore                      # Git игнорирование
├── .dockerignore                   # Docker игнорирование
├── .eslintrc.json                  # ESLint конфигурация
├── .prettierrc                     # Prettier конфигурация
├── tsconfig.json                   # TypeScript конфигурация
├── package.json                    # NPM зависимости
├── package-lock.json              # NPM lock файл
├── nodemon.json                    # Конфигурация для разработки
├── jest.config.js                  # Конфигурация тестов
├── Makefile                        # Команды для управления
├── README.md                       # Основная документация
├── DOCKER_MIGRATION.md            # Инструкция по миграции Docker
└── PROJECT_STRUCTURE.md           # Этот файл
```

## Описание основных директорий

### `/src`
Исходный код приложения, организованный по принципу разделения ответственности.

### `/docker`
Все файлы, связанные с Docker, включая конфигурации для разных окружений.

### `/tests`
Тесты, разделенные на unit и интеграционные.

### `/scripts`
Bash скрипты для автоматизации рутинных задач.

### `/examples`
Примеры использования API для разработчиков.

## Файлы конфигурации

- **tsconfig.json** - настройки TypeScript компилятора
- **jest.config.js** - настройки для запуска тестов
- **nodemon.json** - hot reload для разработки
- **.eslintrc.json** - правила линтинга кода
- **.prettierrc** - форматирование кода
- **Makefile** - удобные команды для работы с проектом

## Переменные окружения

Основные переменные определены в `.env.example`. Создайте `.env` файл на основе примера.

## Docker структура

Docker файлы организованы для поддержки трех режимов:
1. **Базовый** - только Redis и Bull Dashboard
2. **Development** - с hot reload и инструментами отладки
3. **Production** - оптимизированный для production с Nginx и мониторингом