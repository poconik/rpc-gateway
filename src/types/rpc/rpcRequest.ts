export interface RpcRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: unknown[] | Record<string, unknown>;
}
