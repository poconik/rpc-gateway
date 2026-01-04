import logger from './logger.js';
import type { LogLevel } from '../types/logging/logLevel.js';

const writeLog = (event: string, fields: Record<string, unknown> = {}, level: LogLevel = 'info'): void => {
  logger[level]({ ...fields, event }, event);
};

export default writeLog;
