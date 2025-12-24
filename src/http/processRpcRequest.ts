import type { IncomingMessage } from 'node:http';

import readRequestBody from './readRequestBody.js';
import requestSchema from '../rpc/requestSchema.js';
import createRpcError from '../rpc/createRpcError.js';
import type { Config } from '../types/config/config.js';
import forwardRequest from '../gateway/forwardRequest.js';
import type { RpcRequest } from '../types/rpc/rpcRequest.js';
import type { NetworkName } from '../types/config/networkName.js';
import type { GatewayResult } from '../types/gateway/gatewayResult.js';

const processRpcRequest = async (
  config: Config,
  network: NetworkName,
  request: IncomingMessage,
  requestId: string,
  signal: AbortSignal,
): Promise<GatewayResult> => {
  const text = await readRequestBody(request, config.maxRequestBytes, signal);
  let body: unknown;

  try {
    body = JSON.parse(text);
  } catch {
    return createRpcError(400, null, -32700, 'Parse error.', requestId);
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return createRpcError(400, null, -32600, 'Expected a single JSON-RPC 2.0 request with an id.', requestId);
  }

  return forwardRequest(config, network, parsed.data as RpcRequest, requestId, signal);
};

export default processRpcRequest;
