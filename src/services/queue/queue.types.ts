/*
Этот файл содержит все необходимые TypeScript типы и интерфейсы для работы с очередью:

JobStatus - перечисление статусов задачи (pending, processing, completed, failed, timeout)
QueueJobData - структура данных запроса в очереди
JobResult - структура результата выполнения задачи
JobError - структура ошибки
QueueJob - полная информация о задаче
IQueueService - интерфейс для сервиса очереди
*/

import { Request } from 'express';

// Статус задачи в очереди
export enum JobStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    TIMEOUT = 'timeout'
}

// Данные запроса для сохранения в очереди
export interface QueueJobData {
    id: string;
    timestamp: number;
    request: {
        method: string;
        url: string;
        headers: Record<string, string | string[]>;
        body?: any;
        query?: Record<string, any>;
    };
    metadata: {
        clientIp?: string;
        userAgent?: string;
        originalUrl: string;
    };
}

// Результат выполнения задачи
export interface JobResult {
    status: number;
    headers: Record<string, string | string[]>;
    data: any;
    duration: number;
}

// Ошибка выполнения задачи
export interface JobError {
    message: string;
    code?: string;
    status?: number;
    stack?: string;
}

// Полная информация о задаче
export interface QueueJob {
    id: string;
    data: QueueJobData;
    status: JobStatus;
    attempts: number;
    createdAt: Date;
    processedAt?: Date;
    completedAt?: Date;
    result?: JobResult;
    error?: JobError;
}

// Интерфейс для работы с очередью
export interface IQueueService {
    // Добавление задачи в очередь
    addJob(jobData: QueueJobData): Promise<string>;

    // Получение информации о задаче
    getJob(jobId: string): Promise<QueueJob | null>;

    // Получение результата задачи
    getJobResult(jobId: string): Promise<JobResult | null>;

    // Отмена задачи
    cancelJob(jobId: string): Promise<boolean>;

    // Получение статистики очереди
    getQueueStats(): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    }>;

    // Очистка старых задач
    cleanupOldJobs(olderThanMs: number): Promise<number>;
}