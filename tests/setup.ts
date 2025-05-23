// Отключаем логи во время тестов
process.env.LOG_LEVEL = 'silent';

// Мокаем winston logger
jest.mock('../src/config/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));

// Глобальные настройки для всех тестов
beforeEach(() => {
    jest.clearAllMocks();
});

// Увеличиваем таймаут для интеграционных тестов
if (process.env.TEST_TYPE === 'integration') {
    jest.setTimeout(30000);
}