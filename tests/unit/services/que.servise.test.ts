import { RedisQueueService } from '../../../src/services/queue/redis-queue.service';
import { QueueJobData, JobStatus } from '../../../src/services/queue/queue.types';
import Bull from 'bull';
import { v4 as uuidv4 } from 'uuid';

// Мокаем зависимости
jest.mock('../../../src/config/redis', () => ({
    getRequestQueue: jest.fn(),
    getRedisClient: jest.fn()
}));

describe('RedisQueueService', () => {
    let queueService: RedisQueueService;
    let mockQueue: jest.Mocked<Bull.Queue>;
    let mockRedisClient: any;

    beforeEach(() => {
        // Создаем моки
        mockQueue = {
            add: jest.fn(),
            getJob: jest.fn(),
            getWaitingCount: jest.fn().mockResolvedValue(5),
            getActiveCount: jest.fn().mockResolvedValue(1),
            getCompletedCount: jest.fn().mockResolvedValue(100),
            getFailedCount: jest.fn().mockResolvedValue(2),
            getDelayedCount: jest.fn().mockResolvedValue(0),
            clean: jest.fn().mockResolvedValue([])
        } as any;

        mockRedisClient = {
            get: jest.fn(),
            setEx: jest.fn(),
            keys: jest.fn().mockResolvedValue([]),
            ttl: jest.fn(),
            del: jest.fn()
        };

        // Настраиваем моки
        const redis = require('../../../src/config/redis');
        redis.getRequestQueue.mockReturnValue(mockQueue);
        redis.getRedisClient.mockReturnValue(mockRedisClient);

        queueService = new RedisQueueService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('addJob', () => {
        it('should add job to queue successfully', async () => {
            const jobData: QueueJobData = {
                id: uuidv4(),
                timestamp: Date.now(),
                request: {
                    method: 'GET',
                    url: '/test',
                    headers: {},
                    body: null
                },
                metadata: {
                    clientIp: '127.0.0.1',
                    userAgent: 'test-agent',
                    originalUrl: '/api/proxy/test'
                }
            };

            const mockJob = { id: jobData.id };
            mockQueue.add.mockResolvedValue(mockJob as any);

            const jobId = await queueService.addJob(jobData);

            expect(jobId).toBe(jobData.id);
            expect(mockQueue.add).toHaveBeenCalledWith(
                'process-request',
                jobData,
                expect.objectContaining({
                    jobId: jobData.id,
                    timeout: expect.any(Number),
                    removeOnComplete: false
                })
            );
        });

        it('should throw error when queue is full', async () => {
            // Симулируем полную очередь
            mockQueue.getWaitingCount.mockResolvedValue(1000);
            mockQueue.getActiveCount.mockResolvedValue(1);

            const jobData: QueueJobData = {
                id: uuidv4(),
                timestamp: Date.now(),
                request: {
                    method: 'GET',
                    url: '/test',
                    headers: {}
                },
                metadata: {
                    originalUrl: '/test'
                }
            };

            await expect(queueService.addJob(jobData)).rejects.toThrow('Queue is full');
        });
    });

    describe('getJob', () => {
        it('should return job details when job exists', async () => {
            const jobId = '12345';
            const mockJob = {
                id: jobId,
                data: {
                    id: jobId,
                    timestamp: Date.now(),
                    request: { method: 'GET', url: '/test', headers: {} },
                    metadata: { originalUrl: '/test' }
                },
                attemptsMade: 1,
                timestamp: Date.now(),
                processedOn: Date.now(),
                finishedOn: Date.now(),
                getState: jest.fn().mockResolvedValue('completed'),
                returnvalue: { status: 200, headers: {}, data: 'test', duration: 100 }
            };

            mockQueue.getJob.mockResolvedValue(mockJob as any);

            const job = await queueService.getJob(jobId);

            expect(job).toBeTruthy();
            expect(job?.id).toBe(jobId);
            expect(job?.status).toBe(JobStatus.COMPLETED);
            expect(job?.result).toEqual(mockJob.returnvalue);
        });

        it('should return null when job does not exist', async () => {
            mockQueue.getJob.mockResolvedValue(null);

            const job = await queueService.getJob('non-existent');

            expect(job).toBeNull();
        });
    });

    describe('getQueueStats', () => {
        it('should return queue statistics', async () => {
            const stats = await queueService.getQueueStats();

            expect(stats).toEqual({
                waiting: 5,
                active: 1,
                completed: 100,
                failed: 2,
                delayed: 0
            });
        });

        it('should return zero stats on error', async () => {
            mockQueue.getWaitingCount.mockRejectedValue(new Error('Redis error'));

            const stats = await queueService.getQueueStats();

            expect(stats).toEqual({
                waiting: 0,
                active: 0,
                completed: 0,
                failed: 0,
                delayed: 0
            });
        });
    });

    describe('cancelJob', () => {
        it('should cancel waiting job successfully', async () => {
            const mockJob = {
                getState: jest.fn().mockResolvedValue('waiting'),
                remove: jest.fn().mockResolvedValue(true)
            };

            mockQueue.getJob.mockResolvedValue(mockJob as any);

            const result = await queueService.cancelJob('12345');

            expect(result).toBe(true);
            expect(mockJob.remove).toHaveBeenCalled();
        });

        it('should not cancel active job', async () => {
            const mockJob = {
                getState: jest.fn().mockResolvedValue('active'),
                remove: jest.fn()
            };

            mockQueue.getJob.mockResolvedValue(mockJob as any);

            const result = await queueService.cancelJob('12345');

            expect(result).toBe(false);
            expect(mockJob.remove).not.toHaveBeenCalled();
        });
    });
});