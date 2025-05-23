/*
Файл src/services/http-client.service.ts создан!
Этот сервис отвечает за проксирование HTTP запросов к целевому серверу. Основные функции:
Ключевые возможности:

proxyRequest - основной метод для проксирования запросов
prepareHeaders - подготовка и фильтрация заголовков
executeWithRetry - автоматический retry с exponential backoff
isRetryableError - определение, какие ошибки можно повторить
formatError - форматирование ошибок для клиента

Особенности:

Обработка заголовков - исключение системных заголовков, которые не должны проксироваться
Retry логика - автоматический повтор для сетевых и серверных ошибок (5xx)
Обработка данных - корректная обработка бинарных данных и автоматический парсинг JSON
Interceptors - логирование всех запросов и ответов
 */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from '../config/logger';
import { config } from '../config';

export interface ProxyRequestConfig {
    method: string;
    url: string;
    headers?: Record<string, string | string[]>;
    data?: any;
    params?: Record<string, any>;
}

export class HttpClientService {
    private client: AxiosInstance;
    private readonly excludedHeaders = [
        'host',
        'connection',
        'content-length',
        'transfer-encoding',
        'upgrade',
        'http2-settings',
        'te',
        'trailer'
    ];

    constructor() {
        this.client = axios.create({
            baseURL: config.target.url,
            timeout: config.target.timeout,
            maxRedirects: 5,
            validateStatus: () => true, // Принимаем все статусы
            // Отключаем автоматическую декомпрессию для правильного проксирования
            decompress: false
        });

        // Interceptor для логирования запросов
        this.client.interceptors.request.use(
            (request) => {
                logger.debug('Outgoing request:', {
                    method: request.method,
                    url: request.url,
                    headers: request.headers
                });
                return request;
            },
            (error) => {
                logger.error('Request interceptor error:', error);
                return Promise.reject(error);
            }
        );

        // Interceptor для логирования ответов
        this.client.interceptors.response.use(
            (response) => {
                logger.debug('Incoming response:', {
                    status: response.status,
                    headers: response.headers
                });
                return response;
            },
            (error) => {
                logger.error('Response interceptor error:', error);
                return Promise.reject(error);
            }
        );
    }

    async proxyRequest(config: ProxyRequestConfig): Promise<AxiosResponse> {
        try {
            // Подготовка заголовков
            const headers = this.prepareHeaders(config.headers);

            // Формирование конфигурации запроса
            const requestConfig: AxiosRequestConfig = {
                method: config.method as any,
                url: config.url,
                headers,
                data: config.data,
                params: config.params,
                // Важно для правильной обработки бинарных данных
                responseType: 'arraybuffer',
                // Отключаем автоматическое преобразование
                transformResponse: [(data) => data]
            };

            // Выполнение запроса с retry
            const response = await this.executeWithRetry(requestConfig);

            // Преобразование arraybuffer в правильный формат
            const contentType = response.headers['content-type'] || '';
            if (contentType.includes('application/json') || contentType.includes('text/')) {
                try {
                    const text = Buffer.from(response.data).toString('utf-8');
                    response.data = contentType.includes('application/json') ? JSON.parse(text) : text;
                } catch (error) {
                    logger.warn('Failed to parse response data:', error);
                    // Оставляем как есть
                }
            }

            return response;
        } catch (error: any) {
            logger.error('Proxy request failed:', {
                message: error.message,
                code: error.code,
                response: error.response?.data
            });

            // Форматирование ошибки для клиента
            throw this.formatError(error);
        }
    }

    private prepareHeaders(headers?: Record<string, string | string[]>): Record<string, string> {
        if (!headers) {
            return {};
        }

        const prepared: Record<string, string> = {};

        for (const [key, value] of Object.entries(headers)) {
            const lowerKey = key.toLowerCase();

            // Пропускаем исключенные заголовки
            if (this.excludedHeaders.includes(lowerKey)) {
                continue;
            }

            // Преобразуем массивы в строки
            prepared[key] = Array.isArray(value) ? value.join(', ') : value;
        }

        // Добавляем идентификатор прокси
        prepared['X-Proxied-By'] = 'proxy-queue-server';

        return prepared;
    }

    private async executeWithRetry(
        config: AxiosRequestConfig,
        attempt = 1
    ): Promise<AxiosResponse> {
        try {
            return await this.client.request(config);
        } catch (error: any) {
            const shouldRetry =
                attempt < config.target.retries &&
                this.isRetryableError(error);

            if (shouldRetry) {
                const delay = this.calculateRetryDelay(attempt);
                logger.warn(`Retrying request (attempt ${attempt + 1}/${config.target.retries}) after ${delay}ms`);

                await this.sleep(delay);
                return this.executeWithRetry(config, attempt + 1);
            }

            throw error;
        }
    }

    private isRetryableError(error: any): boolean {
        // Не повторяем клиентские ошибки (4xx)
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
            return false;
        }

        // Повторяем сетевые ошибки и 5xx
        return (
            !error.response || // Сетевые ошибки
            error.response.status >= 500 || // Серверные ошибки
            error.code === 'ECONNABORTED' || // Таймаут
            error.code === 'ENOTFOUND' || // DNS ошибки
            error.code === 'ECONNREFUSED' || // Отказ в соединении
            error.code === 'ECONNRESET' // Сброс соединения
        );
    }

    private calculateRetryDelay(attempt: number): number {
        // Экспоненциальная задержка: 1s, 2s, 4s...
        return Math.min(1000 * Math.pow(2, attempt - 1), 10000);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private formatError(error: any): Error {
        if (error.response) {
            // Ошибка от сервера
            const err = new Error(
                `Target server error: ${error.response.status} ${error.response.statusText}`
            );
            (err as any).status = error.response.status;
            (err as any).response = error.response;
            return err;
        } else if (error.request) {
            // Ошибка сети
            const err = new Error(`Network error: ${error.message}`);
            (err as any).code = error.code || 'NETWORK_ERROR';
            return err;
        } else {
            // Другие ошибки
            return error;
        }
    }
}