import writeLog from '../logging/writeLog.js';
import requestProvider from './requestProvider.js';
import createRpcError from '../rpc/createRpcError.js';
import type { Config } from '../types/config/config.js';
import type { RpcRequest } from '../types/rpc/rpcRequest.js';
import isRetryableHttpStatus from './isRetryableHttpStatus.js';
import type { NetworkName } from '../types/config/networkName.js';
import type { GatewayResult } from '../types/gateway/gatewayResult.js';

const forwardRequest = async (
  config: Config,
  network: NetworkName,
  request: RpcRequest,
  requestId: string,
  signal: AbortSignal,
): Promise<GatewayResult> => {
  const startedAt = performance.now();
  const providers = config.networks[network]?.providers.slice(0, config.maxAttempts) ?? [];

  for (const [index, provider] of providers.entries()) {
    const remainingMs = Math.ceil(config.requestTimeoutMs - (performance.now() - startedAt));

    if (remainingMs <= 0 || signal.aborted) {
      return createRpcError(504, request.id, -32001, 'Gateway request deadline exceeded.', requestId);
    }

    const attemptStartedAt = performance.now();

    const result = await requestProvider(
      provider,
      request,
      config,
      signal,
      Math.min(config.attemptTimeoutMs, remainingMs),
    );

    writeLog('provider_attempt', {
      requestId,
      network,
      provider: provider.name,
      method: request.method,
      attempt: index + 1,
      durationMs: Math.round(performance.now() - attemptStartedAt),
      outcome: result.kind,
      httpStatus: result.status,
      reason: result.kind === 'failure' ? result.reason : undefined,
      transportCode: result.kind === 'failure' ? result.transportCode : undefined,
      rpcErrorCode: result.kind === 'response' ? result.body.error?.code : result.rpcErrorCode,
    }, result.kind === 'failure' || result.body.error ? 'warn' : 'info');

    if (result.kind === 'response') {
      return { status: result.status, body: result.body };
    }

    if (
      result.reason === 'http' &&
      !isRetryableHttpStatus(result.status ?? 0)
    ) {
      writeLog('provider_failover_skipped', { requestId, network, provider: provider.name, reason: 'http_status_not_retryable', httpStatus: result.status }, 'warn');

      return createRpcError(502, request.id, -32003, 'Upstream rejected the request. Request was not retried.', requestId);
    }

    if (index + 1 < providers.length && !signal.aborted) {
      writeLog('provider_failover', { requestId, network, from: provider.name, to: providers[index + 1]?.name, reason: result.reason }, 'warn');
    }
  }

  if (signal.aborted || performance.now() - startedAt >= config.requestTimeoutMs) {
    return createRpcError(504, request.id, -32001, 'Gateway request deadline exceeded.', requestId);
  }

  return createRpcError(503, request.id, -32000, 'No upstream provider succeeded within the attempt limit.', requestId);
};

export default forwardRequest;
