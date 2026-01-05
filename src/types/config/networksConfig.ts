import type { NetworkName } from './networkName.js';
import type { NetworkConfig } from './networkConfig.js';

export type NetworksConfig = Partial<Record<NetworkName, NetworkConfig>>;
