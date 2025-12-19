import type { RpcResponse } from '../rpc/rpcResponse.js';

export interface GatewayResult {
  status: number;
  body: RpcResponse;
}
