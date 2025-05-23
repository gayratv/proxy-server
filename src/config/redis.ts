import { createClient, RedisClientType } from 'redis';
import Bull from 'bull';
import { logger } from './logger';

// Redis клиент для общих операций
let redisClient: RedisClientType;

// Bull очереди для обработки запросов
let requestQueue: Bull.Queue;

export const initRedis = async (): Promise<void> => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  // Инициализация Redis клиента
  redisClient = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis reconnection limit reached');
          return new Error('Redis reconnection limit reached');
        }
        return Math.min(retries * 100, 3000);
      }
    }
  });

  redisClient.on('error', (err) => {
    logger.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    logger.info('Redis Client Connected');
  });

  await redisClient.connect();

  // Инициализация Bull очереди
  requestQueue = new Bull('request-queue', redisUrl, {
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  });

  requestQueue.on('error', (error) => {
    logger.error('Queue Error:', error);
  });

  requestQueue.on('waiting', (jobId) => {
    logger.debug(`Job ${jobId} is waiting`);
  });

  requestQueue.on('active', (job) => {
    logger.debug(`Job ${job.id} is active`);
  });

  requestQueue.on('completed', (job) => {
    logger.debug(`Job ${job.id} completed`);
  });

  requestQueue.on('failed', (job, err) => {
    logger.error(`Job ${job.id} failed:`, err);
  });
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

export const getRequestQueue = (): Bull.Queue => {
  if (!requestQueue) {
    throw new Error('Request queue not initialized');
  }
  return requestQueue;
};

export const closeRedis = async (): Promise<void> => {
  if (requestQueue) {
    await requestQueue.close();
  }
  if (redisClient) {
    await redisClient.quit();
  }
};
