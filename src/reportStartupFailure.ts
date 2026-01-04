import writeLog from './logging/writeLog.js';

const reportStartupFailure = (): void => {
  writeLog('startup_failed', { reason: 'Check configuration, environment variables, and listen address.' }, 'fatal');

  process.exitCode = 1;
};

export default reportStartupFailure;
