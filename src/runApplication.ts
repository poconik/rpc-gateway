import { once } from 'node:events';

import shutdown from './shutdown.js';
import writeLog from './logging/writeLog.js';
import readConfig from './config/readConfig.js';
import createGatewayServer from './http/createGatewayServer.js';

const runApplication = async (): Promise<void> => {
  const config = await readConfig(process.env);
  const server = createGatewayServer(config);
  const stop = shutdown.bind(null, server);

  server.listen(config.port, config.host);

  await once(server, 'listening');

  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  writeLog('gateway_started', { host: config.host, port: config.port, networks: Object.keys(config.networks) });
};

export default runApplication;
