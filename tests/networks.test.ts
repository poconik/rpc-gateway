import { test } from 'node:test';

import runNetworkScenario from './helpers/runNetworkScenario.js';
import type { NetworkScenario } from '../src/types/testing/networkScenario.js';

const scenarios: NetworkScenario[] = [
  {
    name: 'mainnet-only configuration leaves the testnet route unavailable',
    mainnet: [{}],
    requests: [
      { path: '/rpc', status: 200, result: 'ok' },
      { path: '/', status: 200, result: 'ok' },
      { path: '/rpc-testnet', status: 404 },
    ],
    expectedMainnetCalls: [2],
  },
  {
    name: 'testnet-only configuration leaves mainnet routes unavailable',
    testnet: [{}],
    requests: [
      { path: '/rpc-testnet', status: 200, result: 'ok' },
      { path: '/rpc', status: 404 },
      { path: '/', status: 404 },
    ],
    expectedTestnetCalls: [1],
  },
  {
    name: 'both networks route to independent provider pools',
    mainnet: [{ body: { jsonrpc: '2.0', id: 7, result: 'mainnet' } }],
    testnet: [{ body: { jsonrpc: '2.0', id: 7, result: 'testnet' } }],
    requests: [
      { path: '/rpc', status: 200, result: 'mainnet' },
      { path: '/rpc-testnet', status: 200, result: 'testnet' },
    ],
    expectedMainnetCalls: [1],
    expectedTestnetCalls: [1],
  },
  {
    name: 'exhausted mainnet providers never fail over to testnet',
    mainnet: [{ status: 503, rawBody: '' }],
    testnet: [{}],
    requests: [
      { path: '/rpc', status: 503 },
      { path: '/rpc-testnet', status: 200, result: 'ok' },
    ],
    expectedMainnetCalls: [1],
    expectedTestnetCalls: [1],
  },
  {
    name: 'testnet failover stays within its own provider pool',
    mainnet: [{}],
    testnet: [{ status: 503, rawBody: '' }, {}],
    requests: [{ path: '/rpc-testnet', status: 200, result: 'ok' }],
    expectedMainnetCalls: [0],
    expectedTestnetCalls: [1, 1],
  },
  {
    name: 'unknown routes do not reach either network',
    mainnet: [{}],
    testnet: [{}],
    requests: [{ path: '/rpc-unknown', status: 404 }],
    expectedMainnetCalls: [0],
    expectedTestnetCalls: [0],
  },
];

for (const scenario of scenarios) {
  test(scenario.name, runNetworkScenario.bind(null, scenario));
}
