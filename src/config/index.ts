import dotenv from 'dotenv';

// Загрузка переменных окружения
dotenv.config();

export const config = {
  // Сервер
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
    trustProxy: process.env.TRUST_PROXY === 'true'
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    maxRetriesPerRequest: 3,
    retryDelay: 1000
  },

  // Целевой сервер
  target: {
    url: process.env.TARGET_URL || 'https://srvchat.com',
    timeout: parseInt(process.env.TARGET_TIMEOUT || '30000', 10),
    retries: parseInt(process.env.TARGET_RETRIES || '3', 10)
  },

  // Rate limiting
  rateLimit: {
    minTime: parseInt(process.env.RATE_LIMIT_MIN_TIME || '500', 10), // 0.5 сек между запросами
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT || '1', 10)
  },

  // Очередь
  queue: {
    maxSize: parseInt(process.env.QUEUE_MAX_SIZE || '1000', 10),
    jobTimeout: parseInt(process.env.JOB_TIMEOUT || '60000', 10), // 60 сек
    cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL || '300000', 10) // 5 мин
  },

  // Кеш
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '300', 10), // 5 минут
    enabled: process.env.CACHE_ENABLED === 'true'
  },

  // Логирование
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json'
  }
};

// Валидация конфигурации
export const validateConfig = (): void => {
  const required = [
    'TARGET_URL'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Проверка корректности URL
  try {
    new URL(config.target.url);
  } catch (error) {
    throw new Error('Invalid TARGET_URL format');
  }
};
