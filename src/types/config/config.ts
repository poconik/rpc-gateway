import type { NetworksConfig } from './networksConfig.js';

export interface Config {
  host: string;
  port: number;
  attemptTimeoutMs: number;
  requestTimeoutMs: number;
  maxAttempts: number;
  maxRequestBytes: number;
  maxResponseBytes: number;
  networks: NetworksConfig;
  secrets: string[];
}
