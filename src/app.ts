/*
Файл src/app.ts создан!
Этот файл настраивает Express приложение со всеми необходимыми middleware и маршрутами:
Основные компоненты:

Безопасность:

Helmet для защиты заголовков
CORS для кросс-доменных запросов


Middleware:

Body parsing для JSON, URL-encoded и бинарных данных
Request ID для трассировки
Логирование всех запросов


Маршруты:

/health/* - проверки здоровья
/api/* - основное API
/ - информация о сервере


Обработка ошибок:

404 handler для несуществующих маршрутов
Глобальный error handler



Особенности:

express-async-errors - автоматическая обработка async ошибок
Trust proxy - поддержка работы за reverse proxy
Limits - ограничение размера тела запроса (10mb)
 */
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import 'express-async-errors';

import { config } from './config';
import { logger } from './config/logger';
import { errorMiddleware } from './middlewares/error.middleware';
import { requestIdMiddleware } from './middlewares/request-id.middleware';
import { proxyRoutes } from './routes/proxy.routes';
import { healthRoutes } from './routes/health.routes';

export const createApp = (): Application => {
  const app = express();

  // Trust proxy
  if (config.server.trustProxy) {
    app.set('trust proxy', true);
  }

  // Security middlewares
  app.use(helmet({
    contentSecurityPolicy: false // Отключаем для проксирования
  }));

  // CORS
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true'
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));

  // Request ID middleware
  app.use(requestIdMiddleware);

  // Request logging
  app.use((req: Request, res: Response, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('Request completed', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration,
        requestId: req.id
      });
    });

    next();
  });

  // Health check routes
  app.use('/health', healthRoutes);

  // API routes
  app.use('/api', proxyRoutes);

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'Proxy Queue Server',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        enqueue: 'POST /api/proxy/*',
        status: 'GET /api/status/:jobId',
        result: 'GET /api/result/:jobId',
        cancel: 'DELETE /api/jobs/:jobId',
        stats: 'GET /api/stats',
        health: 'GET /health'
      }
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.path}`
    });
  });

  // Error handling middleware (должен быть последним)
  app.use(errorMiddleware);

  return app;
};
