#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Proxy Queue Server - Quick Start${NC}"
echo "=================================="

# Проверка Node.js
echo -n "Проверка Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓${NC} (${NODE_VERSION})"
else
    echo -e "${RED}✗${NC}"
    echo "Node.js не установлен. Пожалуйста, установите Node.js 16+"
    exit 1
fi

# Проверка npm
echo -n "Проверка npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓${NC} (${NPM_VERSION})"
else
    echo -e "${RED}✗${NC}"
    echo "npm не установлен"
    exit 1
fi

# Проверка Docker
echo -n "Проверка Docker... "
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | cut -d ',' -f1)
    echo -e "${GREEN}✓${NC} (${DOCKER_VERSION})"
    DOCKER_AVAILABLE=true
else
    echo -e "${YELLOW}⚠${NC} Docker не установлен (опционально)"
    DOCKER_AVAILABLE=false
fi

echo ""

# Установка зависимостей
echo -e "${YELLOW}📦 Установка зависимостей...${NC}"
npm install

# Копирование .env файла
if [ ! -f .env ]; then
    echo -e "${YELLOW}📄 Создание .env файла...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓${NC} .env файл создан"
else
    echo -e "${GREEN}✓${NC} .env файл уже существует"
fi

# Запуск Redis
echo ""
echo -e "${YELLOW}🔧 Настройка Redis...${NC}"

if [ "$DOCKER_AVAILABLE" = true ]; then
    # Проверка, запущен ли Redis
    if docker ps | grep -q proxy-redis; then
        echo -e "${GREEN}✓${NC} Redis уже запущен"
    else
        echo "Запуск Redis через Docker..."
        npm run redis:start
        echo -e "${GREEN}✓${NC} Redis запущен"
    fi
else
    echo -e "${YELLOW}⚠${NC} Docker не доступен. Убедитесь, что Redis запущен локально на порту 6379"
    echo "Для установки Redis: https://redis.io/docs/getting-started/"
fi

# Создание директории для логов
mkdir -p logs

echo ""
echo -e "${GREEN}✅ Установка завершена!${NC}"
echo ""
echo "Доступные команды:"
echo "  npm run dev    - Запуск в режиме разработки"
echo "  npm run build  - Сборка проекта"
echo "  npm start      - Запуск production версии"
echo "  npm test       - Запуск тестов"
echo ""
echo -e "${YELLOW}💡 Совет:${NC} Отредактируйте .env файл для настройки конфигурации"
echo ""

# Предложение запустить сервер
read -p "Запустить сервер в режиме разработки? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}🚀 Запуск сервера...${NC}"
    npm run dev
fi