import type { Server } from 'node:http';
import { createServer } from 'node:http';

import handleRequest from './handleRequest.js';
import type { Config } from '../types/config/config.js';

const createGatewayServer = (config: Config): Server => {
  const server = createServer(handleRequest.bind(null, config));

  server.requestTimeout = config.requestTimeoutMs;
  server.headersTimeout = Math.min(10000, config.requestTimeoutMs);
  server.keepAliveTimeout = 5000;

  return server;
};

export default createGatewayServer;
