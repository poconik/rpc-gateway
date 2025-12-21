import isProviderError from './isProviderError.js';
import getTransportCode from './getTransportCode.js';
import responseSchema from '../rpc/responseSchema.js';
import type { Config } from '../types/config/config.js';
import readResponseBody from '../http/readResponseBody.js';
import type { Provider } from '../types/config/provider.js';
import type { RpcRequest } from '../types/rpc/rpcRequest.js';
import type { RpcResponse } from '../types/rpc/rpcResponse.js';
import type { AttemptResult } from '../types/gateway/attemptResult.js';

const requestProvider = async (
  provider: Provider,
  request: RpcRequest,
  config: Config,
  parentSignal: AbortSignal,
  timeoutMs: number,
): Promise<AttemptResult> => {
  const signal = AbortSignal.any([parentSignal, AbortSignal.timeout(timeoutMs)]);

  try {
    const response = await fetch(provider.url, {
      method: 'POST',
      headers: { ...provider.headers, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(request),
      redirect: 'manual',
      signal,
    });

    const text = await readResponseBody(response, config.maxResponseBytes);
    let body: unknown;

    try {
      body = JSON.parse(text);
    } catch {
      if (!response.ok) {
        return { kind: 'failure', reason: 'http', status: response.status };
      }

      return { kind: 'failure', reason: 'invalid_response', status: response.status };
    }

    const parsed = responseSchema.safeParse(body);

    if (
      !parsed.success ||
      parsed.data.id !== request.id ||
      Object.hasOwn(parsed.data, 'result') === Object.hasOwn(parsed.data, 'error')
    ) {
      if (!response.ok) {
        return { kind: 'failure', reason: 'http', status: response.status };
      }

      return { kind: 'failure', reason: 'invalid_response', status: response.status };
    }

    if (parsed.data.error && isProviderError(parsed.data as RpcResponse, provider, response.status)) {
      return { kind: 'failure', reason: 'provider_error', status: response.status, rpcErrorCode: parsed.data.error.code };
    }

    if (!response.ok && !parsed.data.error) {
      return { kind: 'failure', reason: 'http', status: response.status };
    }

    return { kind: 'response', status: response.status, body: parsed.data as RpcResponse };
  } catch (error) {
    if (signal.aborted) {
      return { kind: 'failure', reason: 'timeout' };
    }

    if (error instanceof RangeError) {
      return { kind: 'failure', reason: 'response_too_large' };
    }

    return { kind: 'failure', reason: 'transport', transportCode: getTransportCode(error) };
  }
};

export default requestProvider;
