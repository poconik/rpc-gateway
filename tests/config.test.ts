import { test } from 'node:test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import type { TestContext } from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';

import readConfig from '../src/config/readConfig.js';

const checkConfig = async (context: TestContext): Promise<void> => {
  const directory = await mkdtemp(join(tmpdir(), 'rpc-gateway-'));
  const path = join(directory, 'gateway.json');

  context.after(rm.bind(null, directory, { recursive: true, force: true }));

  const providers = [
    { name: 'backup', urlEnv: 'BACKUP_URL', priority: 10 },
    { name: 'primary', urlEnv: 'PRIMARY_URL', priority: 1, headersEnv: { authorization: 'RPC_AUTH' } },
    { name: 'disabled', urlEnv: 'UNSET_URL', priority: 0, enabled: false },
  ];

  const environment = {
    GATEWAY_CONFIG: path,
    PRIMARY_URL: 'https://primary.example.com/rpc?key=private-key',
    BACKUP_URL: 'https://backup.example.com/rpc',
    RPC_AUTH: 'Bearer private-token',
    EXTRA_SECRET: 'short-key',
  };

  await writeFile(path, JSON.stringify({ networks: { mainnet: { providers } }, redactEnv: ['EXTRA_SECRET'] }));

  const config = await readConfig(environment);

  assert.equal(config.port, 18545);
  assert.equal(config.networks.mainnet?.providers.length, 2);
  assert.equal(config.networks.mainnet?.providers[0]?.name, 'primary');
  assert.equal(config.networks.mainnet?.providers[1]?.name, 'backup');
  assert.equal(config.networks.mainnet?.providers[0]?.headers.authorization, 'Bearer private-token');
  assert.deepEqual(config.networks.mainnet?.providers[0]?.infrastructureErrors, []);
  assert.equal(config.networks.testnet, undefined);
  assert.ok(config.secrets.includes('private-key'));
  assert.ok(config.secrets.includes('private-token'));
  assert.ok(config.secrets.includes('short-key'));

  const listenConfig = await readConfig({ ...environment, GATEWAY_HOST: '0.0.0.0', GATEWAY_PORT: '18546' });

  assert.equal(listenConfig.host, '0.0.0.0');
  assert.equal(listenConfig.port, 18546);

  await assert.rejects(readConfig({ ...environment, GATEWAY_HOST: ' ' }), /Invalid GATEWAY_HOST/);
  await assert.rejects(readConfig({ ...environment, GATEWAY_PORT: 'invalid' }), /GATEWAY_PORT/);
  await assert.rejects(readConfig({ ...environment, GATEWAY_PORT: '65536' }), /GATEWAY_PORT/);
  await assert.rejects(readConfig({ ...environment, PRIMARY_URL: '' }), /Missing provider URL/);
  await assert.rejects(readConfig({ ...environment, PRIMARY_URL: 'ftp://primary.example.com' }), /requires an HTTP URL/);
  await writeFile(path, JSON.stringify({ networks: { mainnet: { providers: [providers[0], providers[0]] } } }));
  await assert.rejects(readConfig(environment), /names must be unique/);
  await writeFile(path, JSON.stringify({ networks: { mainnet: { providers } } }));
  await assert.rejects(readConfig({ ...environment, BACKUP_URL: environment.PRIMARY_URL }), /URLs must be unique/);
  await writeFile(path, JSON.stringify({ networks: { mainnet: { providers } }, maxAttempts: 0 }));
  await assert.rejects(readConfig(environment), /Invalid gateway configuration/);
  await writeFile(path, JSON.stringify({ networks: {} }));
  await assert.rejects(readConfig(environment), /At least one network/);
  await writeFile(path, JSON.stringify({ networks: { testnet: { providers: [providers[2]] } } }));
  await assert.rejects(readConfig(environment), /at least one enabled provider/);
  await writeFile(path, JSON.stringify({ networks: { testnet: { providers: [] } } }));
  await assert.rejects(readConfig(environment), /Invalid gateway configuration/);
};

test('validates configuration, resolves secrets, and orders enabled providers', checkConfig);
