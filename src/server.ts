/*
Файл src/server.ts создан!
Это главная точка входа приложения, которая отвечает за:
Основные функции:

Инициализация:

Валидация конфигурации
Подключение к Redis
Создание всех сервисов
Запуск обработчика очереди


Запуск сервера:

Создание Express приложения
Запуск HTTP сервера
Логирование параметров запуска


Graceful Shutdown:

Обработка SIGTERM и SIGINT
Остановка приема новых соединений
Завершение текущих задач
Закрытие соединений с Redis
Таймаут 30 секунд для принудительного завершения

4. Обработка ошибок:

unhandledRejection - логирование
uncaughtException - завершение процесса

Особенности:

Последовательная инициализация - каждый шаг логируется
Безопасное завершение - все ресурсы корректно освобождаются
Обработка критических ошибок - процесс завершается с кодом 1

 */
import { createApp } from './app';
import { config, validateConfig } from './config';
import { logger } from './config/logger';
import { initRedis, closeRedis } from './config/redis';
import { RedisQueueService } from './services/queue/redis-queue.service';
import { HttpClientService } from './services/http-client.service';
import { RateLimiterService } from './services/rate-limiter.service';

let rateLimiterService: RateLimiterService;

async function startServer() {
    try {
        // Валидация конфигурации
        validateConfig();
        logger.info('Configuration validated');

        // Инициализация Redis
        await initRedis();
        logger.info('Redis initialized');

        // Инициализация сервисов
        const queueService = new RedisQueueService();
        const httpClient = new HttpClientService();
        rateLimiterService = new RateLimiterService(httpClient, queueService);

        // Запуск обработчика очереди
        await rateLimiterService.start();
        logger.info('Rate limiter service started');

        // Создание Express приложения
        const app = createApp();

        // Запуск сервера
        const server = app.listen(config.server.port, () => {
            logger.info(`Server is running on port ${config.server.port}`, {
                env: config.server.env,
                targetUrl: config.target.url,
                rateLimit: config.rateLimit.minTime + 'ms'
            });
        });

        // Graceful shutdown
        const gracefulShutdown = async (signal: string) => {
            logger.info(`${signal} received, starting graceful shutdown`);

            // Остановка приема новых соединений
            server.close(async () => {
                logger.info('HTTP server closed');

                try {
                    // Остановка rate limiter
                    if (rateLimiterService) {
                        await rateLimiterService.stop();
                        logger.info('Rate limiter service stopped');
                    }

                    // Закрытие Redis соединений
                    await closeRedis();
                    logger.info('Redis connections closed');

                    process.exit(0);
                } catch (error) {
                    logger.error('Error during shutdown:', error);
                    process.exit(1);
                }
            });

            // Принудительное завершение через 30 секунд
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 30000);
        };

        // Обработка сигналов
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Обработка необработанных ошибок
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            process.exit(1);
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Запуск сервера
startServer();