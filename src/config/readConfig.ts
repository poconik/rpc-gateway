import { readFile } from 'node:fs/promises';

import configSchema from './configSchema.js';
import collectSecrets from './collectSecrets.js';
import type { Config } from '../types/config/config.js';
import compareSecrets from '../security/compareSecrets.js';
import resolveNetworkConfig from './resolveNetworkConfig.js';
import type { NetworkName } from '../types/config/networkName.js';
import type { NetworksConfig } from '../types/config/networksConfig.js';

const readConfig = async (environment: NodeJS.ProcessEnv): Promise<Config> => {
  const path = environment.GATEWAY_CONFIG ?? 'config/gateway.json';
  const contents = await readFile(path, 'utf8');
  const parsed = configSchema.safeParse(JSON.parse(contents));

  if (!parsed.success) {
    throw new Error('Invalid gateway configuration. Check the documented configuration fields.');
  }

  const host = environment.GATEWAY_HOST ?? parsed.data.host;
  const port = Number(environment.GATEWAY_PORT ?? parsed.data.port);

  if (
    !host.trim() ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error('Invalid GATEWAY_HOST or GATEWAY_PORT environment variable.');
  }

  const providers = [];
  const networks: NetworksConfig = {};
  const networkNames: NetworkName[] = ['mainnet', 'testnet'];

  for (const name of networkNames) {
    const input = parsed.data.networks[name];

    if (!input) {
      continue;
    }

    const network = resolveNetworkConfig(input, environment);

    networks[name] = network;

    providers.push(...network.providers);
  }

  if (providers.length === 0) {
    throw new Error('At least one network must be configured.');
  }

  const secrets = collectSecrets(providers);

  for (const variable of parsed.data.redactEnv) {
    const value = environment[variable];

    if (!value) {
      throw new Error(`Missing redaction environment variable: ${variable}.`);
    }

    secrets.push(value);
  }

  secrets.sort(compareSecrets);

  return { ...parsed.data, host, port, networks, secrets };
};

export default readConfig;
