#!/bin/bash

# Скрипт для создания Docker структуры

echo "🐳 Настройка Docker структуры для Proxy Queue Server..."

# Создание директорий
echo "📁 Создание директорий..."
mkdir -p docker/{nginx/ssl,monitoring/grafana/{provisioning/{datasources,dashboards},dashboards}}

# Создание пустых SSL файлов (заглушки)
echo "🔒 Создание заглушек для SSL..."
touch docker/nginx/ssl/.gitkeep

# Информация о структуре
echo ""
echo "✅ Docker структура создана!"
echo ""
echo "📂 Структура:"
echo "docker/"
echo "├── docker-compose.yml"
echo "├── docker-compose.dev.yml"
echo "├── docker-compose.prod.yml"
echo "├── Dockerfile"
echo "├── Dockerfile.dev"
echo "├── nginx/"
echo "│   ├── nginx.conf"
echo "│   └── ssl/"
echo "└── monitoring/"
echo "    ├── prometheus.yml"
echo "    └── grafana/"
echo "        ├── dashboards/"
echo "        └── provisioning/"
echo ""
echo "📋 Следующие шаги:"
echo "1. Для разработки: make dev"
echo "2. Для production: make prod"
echo "3. Только Redis: make up"
echo ""
echo "💡 Все Docker команды запускайте из корня проекта!"