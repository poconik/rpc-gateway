import type { Config } from '../types/config/config.js';
import type { NetworkName } from '../types/config/networkName.js';

const resolveRequestNetwork = (config: Config, path: string | undefined): NetworkName | undefined => {
  if ((path === '/' || path === '/rpc') && config.networks.mainnet) {
    return 'mainnet';
  }

  if (path === '/rpc-testnet' && config.networks.testnet) {
    return 'testnet';
  }

  return undefined;
};

export default resolveRequestNetwork;
