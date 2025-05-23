/*
Файл src/middlewares/request-id.middleware.ts создан!
Этот middleware добавляет уникальный идентификатор к каждому запросу:
Основные функции:

Генерация ID - создает уникальный UUID для каждого запроса
Поддержка существующих ID - если клиент передал X-Request-ID, использует его
Расширение типов - добавляет свойство id к Express Request
Передача ID в ответе - добавляет заголовок X-Request-ID в ответ

Особенности:

Трассировка - позволяет отслеживать запрос через все логи
Отладка - упрощает поиск проблем по ID запроса
Совместимость - поддерживает стандартный заголовок X-Request-ID
 */
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Расширяем тип Request
declare global {
    namespace Express {
        interface Request {
            id: string;
        }
    }
}

export const requestIdMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Получаем ID из заголовка или генерируем новый
    const requestId = req.headers['x-request-id'] as string || uuidv4();

    // Добавляем ID к объекту запроса
    req.id = requestId;

    // Добавляем ID в заголовки ответа
    res.setHeader('X-Request-ID', requestId);

    next();
};