import type { MockState } from './mockState.js';

export interface NetworkScenario {
  name: string;
  mainnet?: Omit<MockState, 'calls' | 'received'>[];
  testnet?: Omit<MockState, 'calls' | 'received'>[];
  networks?: Record<string, Omit<MockState, 'calls' | 'received'>[]>;
  expectedCalls?: Record<string, number[]>;
  requests: {
    path: string;
    status: number;
    result?: unknown;
    method?: string;
    params?: unknown[] | Record<string, unknown> | null;
    httpMethod?: string;
    headers?: Record<string, string>;
    expectedHeaders?: Record<string, string>;
  }[];
  expectedMainnetCalls?: number[];
  expectedTestnetCalls?: number[];
}
