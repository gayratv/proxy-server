/*
Файл src/routes/proxy.routes.ts создан!
Этот файл определяет все маршруты для API проксирования:
Маршруты:

GET /api/stats - получение статистики очереди
GET /api/status/:jobId - проверка статуса задачи
GET /api/result/:jobId - получение результата выполненной задачи
DELETE /api/jobs/:jobId - отмена задачи в очереди
ALL /api/proxy/* - проксирование любых запросов (catch-all route)

Особенности:

Порядок важен - роут /proxy/* должен быть последним, так как он перехватывает все запросы
Bind контекста - используется .bind() для сохранения контекста контроллера
Единая точка создания сервисов - все сервисы создаются в одном месте
 */
import { Router } from 'express';
import { ProxyController } from '../controllers/proxy.controller';
import { RedisQueueService } from '../services/queue/redis-queue.service';

const router = Router();

// Создание экземпляра контроллера
const queueService = new RedisQueueService();
const proxyController = new ProxyController(queueService);

// Статистика очереди
router.get('/stats', proxyController.getQueueStats.bind(proxyController));

// Статус задачи
router.get('/status/:jobId', proxyController.getJobStatus.bind(proxyController));

// Результат задачи
router.get('/result/:jobId', proxyController.getJobResult.bind(proxyController));

// Отмена задачи
router.delete('/jobs/:jobId', proxyController.cancelJob.bind(proxyController));

// Проксирование запросов - должно быть последним
// Все запросы на /api/proxy/* будут добавлены в очередь
router.all('/proxy/*', proxyController.enqueueRequest.bind(proxyController));

export { router as proxyRoutes };