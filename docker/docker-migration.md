# Миграция Docker файлов

## Что изменилось

Все Docker-related файлы теперь находятся в директории `docker/` для лучшей организации проекта.

## Новая структура

```
proxy-server/
├── docker/
│   ├── docker-compose.yml           # Базовая конфигурация
│   ├── docker-compose.dev.yml       # Development окружение
│   ├── docker-compose.prod.yml      # Production окружение
│   ├── Dockerfile                   # Production образ
│   ├── Dockerfile.dev              # Development образ
│   ├── nginx/
│   │   ├── nginx.conf             # Конфигурация Nginx
│   │   └── ssl/                   # SSL сертификаты
│   ├── monitoring/
│   │   ├── prometheus.yml         # Конфигурация Prometheus
│   │   └── grafana/              # Grafana dashboards
│   └── README.md                  # Docker документация
├── Makefile                         # Команды (обновлен для новых путей)
└── .dockerignore                   # В корне проекта
```

## Шаги миграции

### 1. Создайте новую структуру

```bash
# Запустите скрипт настройки
chmod +x scripts/setup-docker.sh
./scripts/setup-docker.sh
```

### 2. Переместите существующие файлы

Если у вас есть Docker файлы в корне проекта:

```bash
# Переместите docker-compose файлы
mv docker-compose*.yml docker/

# Переместите Dockerfile файлы
mv Dockerfile* docker/

# Удалите старые файлы если они остались
rm -f docker-compose*.yml Dockerfile*
```

### 3. Обновите .env файл

`.env` файл остается в корне проекта (не перемещайте его).

### 4. Обновите команды

Теперь используйте обновленный Makefile:

```bash
# Старая команда:
docker-compose up -d

# Новая команда:
make up
# или
docker-compose -f docker/docker-compose.yml up -d
```

## Обновленные команды

| Старая команда | Новая команда |
|----------------|---------------|
| `docker-compose up -d` | `make up` |
| `docker-compose -f docker-compose.dev.yml up` | `make dev` |
| `docker-compose down` | `make down` |
| `docker build -t app .` | `make prod-build` |

## Важные изменения

### 1. Контекст сборки

В docker-compose файлах изменен контекст сборки:

```yaml
# Было:
build:
  context: .
  dockerfile: Dockerfile

# Стало:
build:
  context: ..
  dockerfile: docker/Dockerfile
```

### 2. Пути к volumes

Обновлены относительные пути:

```yaml
# Было:
volumes:
  - ./src:/app/src

# Стало:
volumes:
  - ../src:/app/src
```

### 3. Makefile

Все команды в Makefile обновлены для работы с новой структурой.

## Проверка

После миграции проверьте, что все работает:

```bash
# Проверка базовой конфигурации
make up
make ps
make down

# Проверка dev окружения
make dev
# Откройте http://localhost:3000

# Проверка production сборки
make prod-build
```

## Откат изменений

Если нужно вернуться к старой структуре:

1. Переместите файлы обратно в корень
2. Используйте старый Makefile из git истории
3. Обновите пути в docker-compose файлах

## Помощь

- См. `docker/README.md` для подробной документации
- Используйте `make help` для списка доступных команд
- При проблемах проверьте, что выполняете команды из корня проекта