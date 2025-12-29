export interface MockState {
  status?: number;
  body?: unknown;
  rawBody?: string;
  delayMs?: number;
  disconnect?: boolean;
  calls: number;
  received: unknown[];
}
