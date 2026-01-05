import type { Config } from './config.js';
import type { NetworkName } from './networkName.js';
import type { NetworkInput } from './networkInput.js';

export interface ConfigInput extends Omit<Config, 'networks' | 'secrets'> {
  redactEnv: string[];
  networks: Partial<Record<NetworkName, NetworkInput | undefined>>;
}
