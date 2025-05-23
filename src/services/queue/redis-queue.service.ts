/*
Файл src/services/queue/redis-queue.service.ts создан!
Этот файл содержит полную реализацию сервиса очереди на базе Redis с использованием Bull. Основные возможности:
Ключевые методы:

addJob - добавление задачи в очередь с проверкой размера
getJob - получение полной информации о задаче
getJobResult - получение результата выполнения задачи
saveJobResult - сохранение результата в Redis
cancelJob - отмена задачи (только для ожидающих)
getQueueStats - статистика очереди
cleanupOldJobs - очистка старых задач

Особенности реализации:

Хранение результатов - результаты сохраняются в Redis с TTL 1 час
Маппинг статусов - преобразование статусов Bull в наши JobStatus
Обработка ошибок - безопасный парсинг и логирование
Очистка данных - автоматическая очистка старых задач и результатов
 */
import Bull from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { getRequestQueue, getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { config } from '../../config';
import {
    IQueueService,
    QueueJobData,
    QueueJob,
    JobResult,
    JobStatus,
    JobError
} from './queue.types';

export class RedisQueueService implements IQueueService {
    private queue: Bull.Queue;
    private redisClient;
    private readonly RESULT_KEY_PREFIX = 'job:result:';
    private readonly RESULT_TTL = 3600; // 1 час

    constructor() {
        this.queue = getRequestQueue();
        this.redisClient = getRedisClient();
    }

    async addJob(jobData: QueueJobData): Promise<string> {
        try {
            const jobId = jobData.id || uuidv4();

            // Проверка размера очереди
            const stats = await this.getQueueStats();
            const totalJobs = stats.waiting + stats.active + stats.delayed;

            if (totalJobs >= config.queue.maxSize) {
                throw new Error('Queue is full. Please try again later.');
            }

            // Добавление задачи в очередь
            const job = await this.queue.add(
                'process-request',
                jobData,
                {
                    jobId,
                    timeout: config.queue.jobTimeout,
                    removeOnComplete: false // Оставляем для получения результата
                }
            );

            logger.info(`Job ${jobId} added to queue`, {
                method: jobData.request.method,
                url: jobData.request.url
            });

            return job.id.toString();
        } catch (error) {
            logger.error('Failed to add job to queue:', error);
            throw error;
        }
    }

    async getJob(jobId: string): Promise<QueueJob | null> {
        try {
            const job = await this.queue.getJob(jobId);

            if (!job) {
                return null;
            }

            const state = await job.getState();
            const result = await this.getJobResult(jobId);

            return {
                id: job.id.toString(),
                data: job.data as QueueJobData,
                status: this.mapBullStateToJobStatus(state),
                attempts: job.attemptsMade,
                createdAt: new Date(job.timestamp),
                processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
                completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
                result: result || undefined,
                error: job.failedReason ? this.parseJobError(job.failedReason) : undefined
            };
        } catch (error) {
            logger.error(`Failed to get job ${jobId}:`, error);
            return null;
        }
    }

    async getJobResult(jobId: string): Promise<JobResult | null> {
        try {
            const resultKey = `${this.RESULT_KEY_PREFIX}${jobId}`;
            const resultStr = await this.redisClient.get(resultKey);

            if (!resultStr) {
                // Попробуем получить из Bull job
                const job = await this.queue.getJob(jobId);
                if (job && job.returnvalue) {
                    return job.returnvalue as JobResult;
                }
                return null;
            }

            return JSON.parse(resultStr) as JobResult;
        } catch (error) {
            logger.error(`Failed to get job result ${jobId}:`, error);
            return null;
        }
    }

    async saveJobResult(jobId: string, result: JobResult): Promise<void> {
        try {
            const resultKey = `${this.RESULT_KEY_PREFIX}${jobId}`;
            await this.redisClient.setEx(
                resultKey,
                this.RESULT_TTL,
                JSON.stringify(result)
            );
        } catch (error) {
            logger.error(`Failed to save job result ${jobId}:`, error);
            throw error;
        }
    }

    async cancelJob(jobId: string): Promise<boolean> {
        try {
            const job = await this.queue.getJob(jobId);

            if (!job) {
                return false;
            }

            const state = await job.getState();

            // Можно отменить только ожидающие задачи
            if (state === 'waiting' || state === 'delayed') {
                await job.remove();
                logger.info(`Job ${jobId} cancelled`);
                return true;
            }

            return false;
        } catch (error) {
            logger.error(`Failed to cancel job ${jobId}:`, error);
            return false;
        }
    }

    async getQueueStats(): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    }> {
        try {
            const [waiting, active, completed, failed, delayed] = await Promise.all([
                this.queue.getWaitingCount(),
                this.queue.getActiveCount(),
                this.queue.getCompletedCount(),
                this.queue.getFailedCount(),
                this.queue.getDelayedCount()
            ]);

            return { waiting, active, completed, failed, delayed };
        } catch (error) {
            logger.error('Failed to get queue stats:', error);
            return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
        }
    }

    async cleanupOldJobs(olderThanMs: number): Promise<number> {
        try {
            const now = Date.now();
            const grace = 5000; // 5 секунд дополнительно

            // Очистка завершенных задач
            const completed = await this.queue.clean(
                grace,
                'completed',
                olderThanMs
            );

            // Очистка неудачных задач
            const failed = await this.queue.clean(
                grace,
                'failed',
                olderThanMs
            );

            const total = completed.length + failed.length;

            if (total > 0) {
                logger.info(`Cleaned up ${total} old jobs`);
            }

            // Очистка результатов из Redis
            await this.cleanupOldResults(olderThanMs);

            return total;
        } catch (error) {
            logger.error('Failed to cleanup old jobs:', error);
            return 0;
        }
    }

    private async cleanupOldResults(olderThanMs: number): Promise<void> {
        try {
            const keys = await this.redisClient.keys(`${this.RESULT_KEY_PREFIX}*`);

            for (const key of keys) {
                const ttl = await this.redisClient.ttl(key);
                if (ttl < 0 || ttl > this.RESULT_TTL - (olderThanMs / 1000)) {
                    await this.redisClient.del(key);
                }
            }
        } catch (error) {
            logger.error('Failed to cleanup old results:', error);
        }
    }

    private mapBullStateToJobStatus(state: string): JobStatus {
        switch (state) {
            case 'waiting':
            case 'delayed':
                return JobStatus.PENDING;
            case 'active':
                return JobStatus.PROCESSING;
            case 'completed':
                return JobStatus.COMPLETED;
            case 'failed':
                return JobStatus.FAILED;
            default:
                return JobStatus.PENDING;
        }
    }

    private parseJobError(failedReason: string): JobError {
        try {
            return JSON.parse(failedReason);
        } catch {
            return {
                message: failedReason,
                code: 'UNKNOWN_ERROR'
            };
        }
    }
}