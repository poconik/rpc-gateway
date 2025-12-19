import type { Provider } from '../types/config/provider.js';
import providerErrorMessages from './providerErrorMessages.js';
import type { RpcResponse } from '../types/rpc/rpcResponse.js';

const isProviderError = (body: RpcResponse, provider: Provider, status: number): boolean => {
  if (!body.error) {
    return false;
  }

  if ([-32700, -32600, -32601, -32602].includes(body.error.code)) {
    return false;
  }

  if ([401, 402, 403, 429].includes(status)) {
    return true;
  }

  const message = body.error.message.trim().toLowerCase().replace(/[.!]+$/, '');

  if (providerErrorMessages.includes(message)) {
    return true;
  }

  for (const rule of provider.infrastructureErrors ?? []) {
    if (rule.code === body.error.code && rule.message === body.error.message) {
      return true;
    }
  }

  return false;
};

export default isProviderError;
