import type { Config } from '../types/config/config.js';
import type { NetworkName } from '../types/config/networkName.js';

const resolveRequestNetwork = (config: Config, path: string | undefined): NetworkName | undefined => {
  if ((path === '/' || path === '/rpc') && config.networks.mainnet) {
    return 'mainnet';
  }

  if (path === '/rpc-testnet' && config.networks.testnet) {
    return 'testnet';
  }

  const match = /^\/rpc\/([a-z][a-z0-9]*(?:-[a-z0-9]+)*)$/.exec(path ?? '');
  const network = match?.[1];

  if (network && Object.hasOwn(config.networks, network) && config.networks[network]) {
    return network;
  }

  return undefined;
};

export default resolveRequestNetwork;
