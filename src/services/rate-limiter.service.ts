/*
Файл src/services/rate-limiter.service.ts создан!
Этот сервис отвечает за обработку задач из очереди с ограничением частоты запросов. Основные функции:
Ключевые возможности:

start/stop - управление жизненным циклом сервиса
processJob - обработка отдельной задачи из очереди
enforceRateLimit - применение ограничения (минимум 0.5 сек между запросами)
startCleanupScheduler - периодическая очистка старых задач
getMetrics - получение метрик работы

Особенности:

Rate limiting - точное соблюдение минимального интервала между запросами
Обработка ошибок - сохранение ошибок как результатов для клиентов
Логирование - детальное логирование всех этапов обработки
Graceful shutdown - корректное завершение работы
 */
import Bull from 'bull';
import { getRequestQueue } from '../config/redis';
import { logger } from '../config/logger';
import { config } from '../config';
import { HttpClientService } from './http-client.service';
import { RedisQueueService } from './queue/redis-queue.service';
import { QueueJobData, JobResult, JobError } from './queue/queue.types';

export class RateLimiterService {
    private queue: Bull.Queue;
    private httpClient: HttpClientService;
    private queueService: RedisQueueService;
    private isProcessing = false;
    private lastRequestTime = 0;

    constructor(
        httpClient: HttpClientService,
        queueService: RedisQueueService
    ) {
        this.queue = getRequestQueue();
        this.httpClient = httpClient;
        this.queueService = queueService;
    }

    async start(): Promise<void> {
        if (this.isProcessing) {
            logger.warn('Rate limiter already started');
            return;
        }

        this.isProcessing = true;
        logger.info('Starting rate limiter service');

        // Обработчик задач
        this.queue.process('process-request', config.rateLimit.maxConcurrent, async (job) => {
            return this.processJob(job);
        });

        // Запуск периодической очистки
        this.startCleanupScheduler();
    }

    async stop(): Promise<void> {
        this.isProcessing = false;
        await this.queue.close();
        logger.info('Rate limiter service stopped');
    }

    private async processJob(job: Bull.Job<QueueJobData>): Promise<JobResult> {
        const startTime = Date.now();
        const jobData = job.data;

        try {
            logger.info(`Processing job ${job.id}`, {
                method: jobData.request.method,
                url: jobData.request.url
            });

            // Применение rate limiting
            await this.enforceRateLimit();

            // Выполнение запроса
            const result = await this.httpClient.proxyRequest({
                method: jobData.request.method,
                url: jobData.request.url,
                headers: jobData.request.headers,
                data: jobData.request.body,
                params: jobData.request.query
            });

            const jobResult: JobResult = {
                status: result.status,
                headers: result.headers,
                data: result.data,
                duration: Date.now() - startTime
            };

            // Сохранение результата
            await this.queueService.saveJobResult(job.id.toString(), jobResult);

            logger.info(`Job ${job.id} completed successfully`, {
                status: result.status,
                duration: jobResult.duration
            });

            return jobResult;
        } catch (error: any) {
            const jobError: JobError = {
                message: error.message || 'Unknown error',
                code: error.code || 'PROXY_ERROR',
                status: error.response?.status,
                stack: error.stack
            };

            logger.error(`Job ${job.id} failed:`, jobError);

            // Сохраняем ошибку для последующего получения
            await this.saveJobError(job.id.toString(), jobError);

            throw jobError;
        }
    }

    private async enforceRateLimit(): Promise<void> {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const minTime = config.rateLimit.minTime;

        if (timeSinceLastRequest < minTime) {
            const delay = minTime - timeSinceLastRequest;
            logger.debug(`Rate limiting: waiting ${delay}ms`);
            await this.sleep(delay);
        }

        this.lastRequestTime = Date.now();
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async saveJobError(jobId: string, error: JobError): Promise<void> {
        try {
            const errorResult: JobResult = {
                status: error.status || 500,
                headers: {},
                data: { error: error.message },
                duration: 0
            };

            await this.queueService.saveJobResult(jobId, errorResult);
        } catch (err) {
            logger.error(`Failed to save job error for ${jobId}:`, err);
        }
    }

    private startCleanupScheduler(): void {
        setInterval(async () => {
            try {
                const olderThanMs = config.queue.cleanupInterval;
                const cleaned = await this.queueService.cleanupOldJobs(olderThanMs);

                if (cleaned > 0) {
                    logger.info(`Cleaned up ${cleaned} old jobs`);
                }
            } catch (error) {
                logger.error('Cleanup scheduler error:', error);
            }
        }, config.queue.cleanupInterval);
    }

    async getMetrics(): Promise<{
        queueStats: any;
        processingRate: number;
        averageResponseTime: number;
    }> {
        const stats = await this.queueService.getQueueStats();

        // Здесь можно добавить более сложные метрики
        return {
            queueStats: stats,
            processingRate: config.rateLimit.maxConcurrent / (config.rateLimit.minTime / 1000),
            averageResponseTime: 0 // TODO: Implement average response time tracking
        };
    }
}