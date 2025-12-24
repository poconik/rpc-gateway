import { randomUUID } from 'node:crypto';
import { setTimeout, clearTimeout } from 'node:timers';
import type { IncomingMessage, ServerResponse } from 'node:http';

import sendJson from './sendJson.js';
import writeLog from '../logging/writeLog.js';
import createRpcError from '../rpc/createRpcError.js';
import processRpcRequest from './processRpcRequest.js';
import type { Config } from '../types/config/config.js';
import resolveRequestNetwork from './resolveRequestNetwork.js';

const handleRequest = async (config: Config, request: IncomingMessage, response: ServerResponse): Promise<void> => {
  const requestId = randomUUID();
  const network = resolveRequestNetwork(config, request.url);
  const startedAt = performance.now();
  const controller = new AbortController();
  const abort = controller.abort.bind(controller);
  const timer = setTimeout(abort, config.requestTimeoutMs);

  response.setHeader('x-request-id', requestId);
  response.once('close', abort);

  try {
    if (request.method === 'GET' && request.url === '/healthz') {
      sendJson(response, 200, { status: 'ok' }, config.secrets);

      return;
    }

    if (!network) {
      response.setHeader('connection', 'close');

      sendJson(response, 404, { error: 'Not found.', requestId }, config.secrets);

      return;
    }

    if (request.method !== 'POST') {
      response.setHeader('allow', 'POST');
      response.setHeader('connection', 'close');

      sendJson(response, 405, { error: 'Method not allowed.', requestId }, config.secrets);

      return;
    }

    if (request.headers['content-type']?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
      response.setHeader('connection', 'close');

      sendJson(response, 415, { error: 'Content-Type must be application/json.', requestId }, config.secrets);

      return;
    }

    request.setTimeout(config.requestTimeoutMs, request.destroy.bind(request));

    const result = await processRpcRequest(config, network, request, requestId, controller.signal);

    sendJson(response, result.status, result.body, config.secrets);
  } catch (error) {
    const tooLarge = error instanceof RangeError;

    const result = createRpcError(
      tooLarge ? 413 : 500,
      null,
      tooLarge ? -32600 : -32603,
      tooLarge ? 'Request body exceeds the configured limit.' : 'Internal gateway error.',
      requestId,
    );

    response.setHeader('connection', 'close');
    request.resume();

    writeLog('request_error', { requestId, network, reason: tooLarge ? 'request_too_large' : 'internal' });

    sendJson(response, result.status, result.body, config.secrets);
  } finally {
    clearTimeout(timer);

    response.removeListener('close', abort);

    writeLog('request_completed', { requestId, network, httpStatus: response.statusCode, durationMs: Math.round(performance.now() - startedAt) });
  }
};

export default handleRequest;
