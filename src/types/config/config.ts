import type { NetworkName } from './networkName.js';
import type { NetworkConfig } from './networkConfig.js';

export interface Config {
  host: string;
  port: number;
  attemptTimeoutMs: number;
  requestTimeoutMs: number;
  maxAttempts: number;
  maxRequestBytes: number;
  maxResponseBytes: number;
  networks: Partial<Record<NetworkName, NetworkConfig>>;
  secrets: string[];
}
