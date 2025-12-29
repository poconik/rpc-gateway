import type { MockState } from './mockState.js';

export interface NetworkScenario {
  name: string;
  mainnet?: Omit<MockState, 'calls' | 'received'>[];
  testnet?: Omit<MockState, 'calls' | 'received'>[];
  requests: {
    path: string;
    status: number;
    result?: unknown;
  }[];
  expectedMainnetCalls?: number[];
  expectedTestnetCalls?: number[];
}
