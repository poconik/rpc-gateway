import type { MockState } from './mockState.js';
import type { ProviderErrorRule } from '../config/providerErrorRule.js';

export interface Scenario {
  name: string;
  providers: Omit<MockState, 'calls' | 'received'>[];
  expectedCalls: number[];
  expectedStatus: number;
  expectedError?: number;
  expectedResult?: unknown;
  expectedMessage?: string;
  method?: string;
  infrastructureErrors?: ProviderErrorRule[];
  request?: unknown;
  maxAttempts?: number;
  requestTimeoutMs?: number;
  attemptTimeoutMs?: number;
  maxRequestBytes?: number;
  maxResponseBytes?: number;
  secrets?: string[];
}
