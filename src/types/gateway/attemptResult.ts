import type { RpcResponse } from '../rpc/rpcResponse.js';

export type AttemptResult =
  | { kind: 'response'; status: number; body: RpcResponse }
  | {
    kind: 'failure';
    reason: 'timeout' | 'transport' | 'http' | 'provider_error' | 'invalid_response' | 'response_too_large';
    status?: number;
    rpcErrorCode?: number;
    transportCode?: string | undefined;
  };
