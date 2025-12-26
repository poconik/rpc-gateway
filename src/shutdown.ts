import type { Server } from 'node:http';

import writeLog from './logging/writeLog.js';

const shutdown = (server: Server): void => {
  writeLog('shutdown_started');

  server.close();
  server.closeIdleConnections();

  const timer = setTimeout(server.closeAllConnections.bind(server), 10000);

  timer.unref();
};

export default shutdown;
