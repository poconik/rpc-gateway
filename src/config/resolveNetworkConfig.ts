import resolveProvider from './resolveProvider.js';
import compareProviders from './compareProviders.js';
import type { NetworkInput } from '../types/config/networkInput.js';
import type { NetworkConfig } from '../types/config/networkConfig.js';

const resolveNetworkConfig = (input: NetworkInput, environment: NodeJS.ProcessEnv): NetworkConfig => {
  const providers = [];
  const names = new Set<string>();
  const urls = new Set<string>();

  for (const entry of input.providers) {
    if (names.has(entry.name)) {
      throw new Error('Provider names must be unique within a network.');
    }

    names.add(entry.name);

    if (!entry.enabled) {
      continue;
    }

    const provider = resolveProvider(entry, environment);

    if (urls.has(provider.url)) {
      throw new Error('Enabled provider URLs must be unique within a network.');
    }

    urls.add(provider.url);
    providers.push(provider);
  }

  if (providers.length === 0) {
    throw new Error('Each configured network requires at least one enabled provider.');
  }

  providers.sort(compareProviders);

  return { providers };
};

export default resolveNetworkConfig;
