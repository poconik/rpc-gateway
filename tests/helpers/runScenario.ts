import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { TestContext } from 'node:test';

import startServer from './startServer.js';
import closeServer from './closeServer.js';
import handleMockRequest from './handleMockRequest.js';
import type { Config } from '../../src/types/config/config.js';
import type { Scenario } from '../../src/types/testing/scenario.js';
import type { MockState } from '../../src/types/testing/mockState.js';
import type { RpcResponse } from '../../src/types/rpc/rpcResponse.js';
import createGatewayServer from '../../src/http/createGatewayServer.js';

const runScenario = async (scenario: Scenario, context: TestContext): Promise<void> => {
  const states: MockState[] = [];

  const config: Config = {
    host: '127.0.0.1',
    port: 3000,
    attemptTimeoutMs: scenario.attemptTimeoutMs ?? 500,
    requestTimeoutMs: scenario.requestTimeoutMs ?? 3000,
    maxAttempts: scenario.maxAttempts ?? 3,
    maxRequestBytes: scenario.maxRequestBytes ?? 1048576,
    maxResponseBytes: scenario.maxResponseBytes ?? 1048576,
    networks: { mainnet: { providers: [] } },
    secrets: scenario.secrets ?? [],
  };

  for (const [index, provider] of scenario.providers.entries()) {
    const state: MockState = { ...provider, calls: 0, received: [] };
    const mock = createServer(handleMockRequest.bind(null, state));
    const url = await startServer(mock);

    context.after(closeServer.bind(null, mock));
    states.push(state);
    config.networks.mainnet?.providers.push({ name: `provider-${index}`, priority: index, url, headers: {}, infrastructureErrors: scenario.infrastructureErrors ?? [] });
  }

  const server = createGatewayServer(config);
  const url = await startServer(server);

  context.after(closeServer.bind(null, server));

  const input = scenario.request ?? { jsonrpc: '2.0', id: 7, method: scenario.method ?? 'getStatus', params: [] };

  const response = await fetch(`${url}/rpc`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });

  const body = await response.json() as RpcResponse;

  assert.equal(response.status, scenario.expectedStatus);
  assert.ok(response.headers.get('x-request-id'));

  if (scenario.expectedError !== undefined) {
    assert.equal(body.error?.code, scenario.expectedError);
  }

  if (scenario.expectedMessage !== undefined) {
    assert.equal(body.error?.message, scenario.expectedMessage);
  }

  if (Object.hasOwn(scenario, 'expectedResult')) {
    assert.deepEqual(body.result, scenario.expectedResult);
  }

  for (const [index, state] of states.entries()) {
    assert.equal(state.calls, scenario.expectedCalls[index], `Unexpected calls to provider ${index}.`);

    for (const received of state.received) {
      assert.deepEqual(received, input);
    }
  }
};

export default runScenario;
