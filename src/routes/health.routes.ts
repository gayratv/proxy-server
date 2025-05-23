/*
Файл src/routes/health.routes.ts создан!
Этот файл содержит эндпоинты для мониторинга состояния приложения:
Эндпоинты:

GET /health - базовая проверка (всегда возвращает 200 если сервер работает)
GET /health/detailed - детальная проверка всех компонентов
GET /health/ready - проверка готовности к приему трафика

Проверки:

Redis - доступность Redis сервера
Queue - работоспособность очереди Bull
System - информация о памяти, CPU, uptime

Использование:

Kubernetes - используйте /health/ready для readiness probe и /health для liveness probe
Мониторинг - /health/detailed предоставляет полную информацию для систем мониторинга
Load Balancer - может использовать /health для проверки доступности
 */
import { Router, Request, Response } from 'express';
import { getRedisClient, getRequestQueue } from '../config/redis';
import { logger } from '../config/logger';

const router = Router();

// Простая проверка здоровья
router.get('/', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Детальная проверка здоровья
router.get('/detailed', async (req: Request, res: Response) => {
    const checks = {
        server: 'healthy',
        redis: 'unknown',
        queue: 'unknown'
    };

    let isHealthy = true;

    // Проверка Redis
    try {
        const redis = getRedisClient();
        await redis.ping();
        checks.redis = 'healthy';
    } catch (error) {
        logger.error('Redis health check failed:', error);
        checks.redis = 'unhealthy';
        isHealthy = false;
    }

    // Проверка очереди
    try {
        const queue = getRequestQueue();
        await queue.getJobCounts();
        checks.queue = 'healthy';
    } catch (error) {
        logger.error('Queue health check failed:', error);
        checks.queue = 'unhealthy';
        isHealthy = false;
    }

    // Системная информация
    const systemInfo = {
        memory: {
            used: process.memoryUsage().heapUsed,
            total: process.memoryUsage().heapTotal,
            rss: process.memoryUsage().rss
        },
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
        version: process.version,
        env: process.env.NODE_ENV
    };

    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        checks,
        system: systemInfo,
        timestamp: new Date().toISOString()
    });
});

// Готовность к приему трафика
router.get('/ready', async (req: Request, res: Response) => {
    try {
        // Проверяем подключение к Redis
        const redis = getRedisClient();
        await redis.ping();

        res.status(200).json({
            ready: true,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            ready: false,
            error: 'Service not ready',
            timestamp: new Date().toISOString()
        });
    }
});

export { router as healthRoutes };