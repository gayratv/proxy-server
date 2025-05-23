import winston from 'winston';

const { combine, timestamp, errors, json, simple, colorize, printf } = winston.format;

// Кастомный формат для консоли
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

// Создание логгера
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    })
  ),
  defaultMeta: { service: 'proxy-queue-server' },
  transports: []
});

// Транспорт для файлов в production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: json()
  }));

  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    format: json()
  }));
}

// Транспорт для консоли
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      consoleFormat
    )
  }));
} else {
  logger.add(new winston.transports.Console({
    format: json()
  }));
}

// Обработка исключений
logger.exceptions.handle(
  new winston.transports.File({ filename: 'logs/exceptions.log' })
);

// Обработка promise rejections
logger.rejections.handle(
  new winston.transports.File({ filename: 'logs/rejections.log' })
);

export default logger;
