# Build stage
FROM node:18-alpine AS builder

# Установка зависимостей для компиляции
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Копирование файлов package
COPY package*.json ./
COPY tsconfig.json ./

# Установка зависимостей
RUN npm ci

# Копирование исходного кода
COPY ../src ./src

# Сборка TypeScript
RUN npm run build

# Удаление dev зависимостей
RUN npm prune --production

# Production stage
FROM node:18-alpine

# Создание пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Копирование собранного приложения
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Создание директории для логов
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Переключение на пользователя nodejs
USER nodejs

# Expose порт
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Запуск приложения
CMD ["node", "dist/server.js"]