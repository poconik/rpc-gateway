import { join } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { TestContext } from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';

import startServer from './startServer.js';
import closeServer from './closeServer.js';
import handleMockRequest from './handleMockRequest.js';
import readConfig from '../../src/config/readConfig.js';
import type { MockState } from '../../src/types/testing/mockState.js';
import type { RpcResponse } from '../../src/types/rpc/rpcResponse.js';
import createGatewayServer from '../../src/http/createGatewayServer.js';
import type { NetworkName } from '../../src/types/config/networkName.js';
import type { NetworkInput } from '../../src/types/config/networkInput.js';
import type { NetworkScenario } from '../../src/types/testing/networkScenario.js';

const runNetworkScenario = async (scenario: NetworkScenario, context: TestContext): Promise<void> => {
  const directory = await mkdtemp(join(tmpdir(), 'rpc-gateway-networks-'));
  const path = join(directory, 'gateway.json');
  const environment: NodeJS.ProcessEnv = { GATEWAY_CONFIG: path };
  const states: Record<NetworkName, MockState[]> = {};
  const networks: Partial<Record<NetworkName, NetworkInput>> = {};

  const definitionsByNetwork = {
    mainnet: scenario.mainnet,
    testnet: scenario.testnet,
    ...scenario.networks,
  };

  context.after(rm.bind(null, directory, { recursive: true, force: true }));

  for (const [name, definitions] of Object.entries(definitionsByNetwork)) {
    if (!definitions) {
      continue;
    }

    const network: NetworkInput = { providers: [] };
    const networkStates: MockState[] = [];

    states[name] = networkStates;

    for (const [index, definition] of definitions.entries()) {
      const state: MockState = { ...definition, calls: 0, received: [] };
      const server = createServer(handleMockRequest.bind(null, state));
      const url = await startServer(server);
      const variable = `${name.toUpperCase().replaceAll('-', '_')}_URL_${index}`;

      context.after(closeServer.bind(null, server));
      networkStates.push(state);

      environment[variable] = url;

      network.providers.push({ name: `provider-${index}`, urlEnv: variable, priority: index, enabled: true, headersEnv: {} });
    }

    networks[name] = network;
  }

  await writeFile(path, JSON.stringify({ networks }));

  const config = await readConfig(environment);
  const server = createGatewayServer(config);
  const url = await startServer(server);

  context.after(closeServer.bind(null, server));

  for (const expected of scenario.requests) {
    const httpMethod = expected.httpMethod ?? 'POST';

    const response = await fetch(`${url}${expected.path}`, {
      method: httpMethod,
      headers: { 'content-type': 'application/json', ...expected.headers },
      ...(httpMethod === 'POST' ? {
        body: JSON.stringify({ jsonrpc: '2.0', id: 7, method: expected.method ?? 'customCall', params: expected.params === undefined ? [] : expected.params }),
      } : {}),
    });

    assert.equal(response.status, expected.status);

    for (const [name, value] of Object.entries(expected.expectedHeaders ?? {})) {
      assert.equal(response.headers.get(name), value);
    }

    const text = await response.text();

    if (expected.status === 204) {
      assert.equal(text, '');

      continue;
    }

    const body = JSON.parse(text) as RpcResponse;

    if (Object.hasOwn(expected, 'result')) {
      assert.deepEqual(body.result, expected.result);
    }
  }

  for (const [name, networkStates] of Object.entries(states)) {
    const expected = scenario.expectedCalls?.[name] ?? (name === 'mainnet' ? scenario.expectedMainnetCalls : scenario.expectedTestnetCalls);

    for (const [index, state] of networkStates.entries()) {
      assert.equal(state.calls, expected?.[index], `Unexpected calls to ${name} provider ${index}.`);
    }
  }
};

export default runNetworkScenario;
