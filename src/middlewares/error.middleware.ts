/*
Файл src/middlewares/error.middleware.ts создан!
Этот middleware отвечает за централизованную обработку всех ошибок в приложении:
Основные функции:

Логирование ошибок - все ошибки логируются с полным контекстом
Форматирование ответов - единообразный формат ошибок для клиентов
Режимы работы - в development режиме возвращается больше информации
Специальные случаи - обработка ValidationError, SyntaxError и других типов

Особенности:

Request ID - в каждом ответе об ошибке есть ID запроса для отладки
Безопасность - в production не раскрываются детали реализации
Статус коды - автоматическое определение HTTP статуса
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export interface AppError extends Error {
    status?: number;
    code?: string;
    details?: any;
}

export const errorMiddleware = (
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Логирование ошибки
    logger.error('Error middleware caught:', {
        error: err.message,
        code: err.code,
        status: err.status,
        stack: err.stack,
        requestId: req.id,
        method: req.method,
        url: req.originalUrl
    });

    // Определение статуса ответа
    const status = err.status || 500;

    // Формирование ответа
    const response: any = {
        success: false,
        error: err.message || 'Internal Server Error',
        requestId: req.id
    };

    // В режиме разработки добавляем больше информации
    if (process.env.NODE_ENV === 'development') {
        response.code = err.code;
        response.stack = err.stack;
        response.details = err.details;
    }

    // Специальная обработка некоторых ошибок
    if (err.name === 'ValidationError') {
        response.error = 'Validation Error';
        response.details = err.details;
    } else if (err.name === 'SyntaxError' && (err as any).type === 'entity.parse.failed') {
        response.error = 'Invalid JSON';
    }

    res.status(status).json(response);
};