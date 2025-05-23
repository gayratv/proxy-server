/*
Файл src/controllers/proxy.controller.ts создан!
Этот контроллер обрабатывает все HTTP запросы, связанные с проксированием. Основные методы:
Ключевые методы:

enqueueRequest - добавляет запрос в очередь и возвращает job ID
getJobStatus - возвращает текущий статус задачи
getJobResult - возвращает результат выполненной задачи
cancelJob - отменяет задачу, если она еще не начала выполняться
getQueueStats - возвращает статистику очереди

Особенности:

Асинхронная обработка - все запросы добавляются в очередь и возвращается 202 Accepted
Оценка времени ожидания - клиенту сообщается примерное время ожидания
Обработка ошибок - разные типы ошибок обрабатываются по-разному
Фильтрация заголовков - исключаются системные заголовки при проксировании

*/
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RedisQueueService } from '../services/queue/redis-queue.service';
import { QueueJobData, JobStatus } from '../services/queue/queue.types';
import { logger } from '../config/logger';
import { config } from '../config';

export class ProxyController {
    constructor(private queueService: RedisQueueService) {}

    /**
     * Добавление запроса в очередь
     */
    async enqueueRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const jobId = uuidv4();

            // Формирование данных для очереди
            const jobData: QueueJobData = {
                id: jobId,
                timestamp: Date.now(),
                request: {
                    method: req.method,
                    url: req.path,
                    headers: this.extractHeaders(req),
                    body: req.body,
                    query: req.query
                },
                metadata: {
                    clientIp: req.ip,
                    userAgent: req.get('user-agent'),
                    originalUrl: req.originalUrl
                }
            };

            // Добавление в очередь
            await this.queueService.addJob(jobData);

            // Возвращаем ID задачи для отслеживания
            res.status(202).json({
                success: true,
                jobId,
                message: 'Request queued successfully',
                checkStatusUrl: `/status/${jobId}`,
                estimatedWaitTime: await this.estimateWaitTime()
            });
        } catch (error: any) {
            logger.error('Failed to enqueue request:', error);

            if (error.message.includes('Queue is full')) {
                res.status(503).json({
                    success: false,
                    error: 'Service temporarily unavailable',
                    message: 'Request queue is full. Please try again later.'
                });
            } else {
                next(error);
            }
        }
    }

    /**
     * Получение статуса задачи
     */
    async getJobStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { jobId } = req.params;

            if (!jobId) {
                res.status(400).json({
                    success: false,
                    error: 'Job ID is required'
                });
                return;
            }

            const job = await this.queueService.getJob(jobId);

            if (!job) {
                res.status(404).json({
                    success: false,
                    error: 'Job not found'
                });
                return;
            }

            // Если задача завершена, возвращаем результат
            if (job.status === JobStatus.COMPLETED && job.result) {
                res.status(200).json({
                    success: true,
                    status: job.status,
                    result: {
                        status: job.result.status,
                        headers: job.result.headers,
                        data: job.result.data
                    },
                    metadata: {
                        duration: job.result.duration,
                        completedAt: job.completedAt
                    }
                });
            }
            // Если задача провалилась
            else if (job.status === JobStatus.FAILED && job.error) {
                res.status(200).json({
                    success: false,
                    status: job.status,
                    error: job.error,
                    metadata: {
                        attempts: job.attempts,
                        failedAt: job.completedAt
                    }
                });
            }
            // Задача еще в процессе
            else {
                const position = await this.getQueuePosition(jobId);
                res.status(200).json({
                    success: true,
                    status: job.status,
                    position,
                    metadata: {
                        createdAt: job.createdAt,
                        attempts: job.attempts
                    }
                });
            }
        } catch (error) {
            logger.error('Failed to get job status:', error);
            next(error);
        }
    }

    /**
     * Получение результата задачи (redirect)
     */
    async getJobResult(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { jobId } = req.params;

            const result = await this.queueService.getJobResult(jobId);

            if (!result) {
                res.status(404).json({
                    success: false,
                    error: 'Result not found',
                    message: 'Job may still be processing or has expired'
                });
                return;
            }

            // Применяем заголовки из оригинального ответа
            const excludedHeaders = ['content-encoding', 'content-length', 'transfer-encoding'];

            Object.entries(result.headers).forEach(([key, value]) => {
                if (!excludedHeaders.includes(key.toLowerCase())) {
                    res.set(key, value as string);
                }
            });

            // Возвращаем оригинальный статус и данные
            res.status(result.status).send(result.data);
        } catch (error) {
            logger.error('Failed to get job result:', error);
            next(error);
        }
    }

    /**
     * Отмена задачи
     */
    async cancelJob(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { jobId } = req.params;

            const cancelled = await this.queueService.cancelJob(jobId);

            if (cancelled) {
                res.status(200).json({
                    success: true,
                    message: 'Job cancelled successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: 'Cannot cancel job',
                    message: 'Job may be already processing or completed'
                });
            }
        } catch (error) {
            logger.error('Failed to cancel job:', error);
            next(error);
        }
    }

    /**
     * Получение статистики очереди
     */
    async getQueueStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const stats = await this.queueService.getQueueStats();

            res.status(200).json({
                success: true,
                stats,
                config: {
                    maxQueueSize: config.queue.maxSize,
                    rateLimit: config.rateLimit.minTime,
                    maxConcurrent: config.rateLimit.maxConcurrent
                }
            });
        } catch (error) {
            logger.error('Failed to get queue stats:', error);
            next(error);
        }
    }

    /**
     * Извлечение заголовков для проксирования
     */
    private extractHeaders(req: Request): Record<string, string | string[]> {
        const headers: Record<string, string | string[]> = {};

        // Копируем все заголовки кроме некоторых
        const excludedHeaders = [
            'host',
            'connection',
            'upgrade',
            'content-length' // Будет пересчитан
        ];

        Object.entries(req.headers).forEach(([key, value]) => {
            if (!excludedHeaders.includes(key.toLowerCase()) && value !== undefined) {
                headers[key] = value;
            }
        });

        return headers;
    }

    /**
     * Оценка времени ожидания
     */
    private async estimateWaitTime(): Promise<number> {
        try {
            const stats = await this.queueService.getQueueStats();
            const queueLength = stats.waiting + stats.active;

            // Примерная оценка: количество задач * минимальное время между запросами
            return queueLength * config.rateLimit.minTime;
        } catch (error) {
            logger.error('Failed to estimate wait time:', error);
            return 0;
        }
    }

    /**
     * Получение позиции в очереди
     */
    private async getQueuePosition(jobId: string): Promise<number | null> {
        try {
            // TODO: Implement actual position calculation
            // Для этого нужно будет расширить RedisQueueService
            return null;
        } catch (error) {
            logger.error('Failed to get queue position:', error);
            return null;
        }
    }
}