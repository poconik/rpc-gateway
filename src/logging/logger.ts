import { pino, stdTimeFunctions } from 'pino';

const format = process.env.LOG_FORMAT ?? (process.env.NODE_ENV === 'development' ? 'pretty' : 'json');

const transport = format === 'pretty'
  ? {
    target: 'pino-pretty',
    options: {
      colorize: process.stdout.isTTY === true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
      ignore: 'pid,hostname',
      singleLine: true,
    },
  }
  : undefined;

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: null,
  timestamp: stdTimeFunctions.isoTime,
  redact: {
    paths: ['authorization', 'apiKey', 'url', 'headers', 'body', 'params', '*.authorization', '*.apiKey', '*.url'],
    censor: '[REDACTED]',
  },
  ...(transport ? { transport } : {}),
});

export default logger;
