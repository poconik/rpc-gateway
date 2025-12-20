import type { RpcResponse } from '../types/rpc/rpcResponse.js';
import type { GatewayResult } from '../types/gateway/gatewayResult.js';

const createRpcError = (
  status: number,
  id: RpcResponse['id'],
  code: number,
  message: string,
  requestId: string,
): GatewayResult => {
  return { status, body: { jsonrpc: '2.0', id, error: { code, message, data: { requestId } } } };
};

export default createRpcError;
