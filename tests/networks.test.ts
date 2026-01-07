import { test } from 'node:test';

import runNetworkScenario from './helpers/runNetworkScenario.js';
import type { NetworkScenario } from '../src/types/testing/networkScenario.js';

const scenarios: NetworkScenario[] = [
  {
    name: 'multiple chains and environments route independently without a method allowlist',
    networks: {
      'ethereum-mainnet': [{ body: { jsonrpc: '2.0', id: 7, result: 'ethereum' } }],
      'stellar-mainnet': [{ body: { jsonrpc: '2.0', id: 7, result: 'stellar' } }],
      'stellar-testnet': [{ body: { jsonrpc: '2.0', id: 7, result: 'testnet' } }],
    },
    requests: [
      { path: '/rpc/ethereum-mainnet', method: 'eth_call', params: [{ to: '0x1234', data: '0x' }, 'latest'], status: 200, result: 'ethereum' },
      { path: '/rpc/stellar-mainnet', method: 'simulateTransaction', params: { transaction: 'sample-envelope' }, status: 200, result: 'stellar' },
      { path: '/rpc/stellar-testnet', method: 'getHealth', status: 200, result: 'testnet' },
      { path: '/rpc/unknown-mainnet', status: 404 },
      { path: '/rpc/toString', status: 404 },
      { path: '/rpc/constructor', status: 404 },
      { path: '/rpc/stellar-mainnet/extra', status: 404 },
      { path: '/rpc', status: 404 },
      { path: '/rpc-testnet', status: 404 },
    ],
    expectedCalls: { 'ethereum-mainnet': [1], 'stellar-mainnet': [1], 'stellar-testnet': [1] },
  },
  {
    name: 'chain failover never reaches another chain or environment',
    networks: {
      'ethereum-mainnet': [{ status: 503, rawBody: '' }, {}],
      'ethereum-sepolia': [{}],
      'stellar-mainnet': [{}],
    },
    requests: [{ path: '/rpc/ethereum-mainnet', method: 'eth_sendRawTransaction', status: 200, result: 'ok' }],
    expectedCalls: { 'ethereum-mainnet': [1, 1], 'ethereum-sepolia': [0], 'stellar-mainnet': [0] },
  },
  {
    name: 'exhausted chain providers never reach other configured chains',
    networks: { 'ethereum-mainnet': [{ status: 503, rawBody: '' }], 'stellar-mainnet': [{}] },
    requests: [{ path: '/rpc/ethereum-mainnet', status: 503 }],
    expectedCalls: { 'ethereum-mainnet': [1], 'stellar-mainnet': [0] },
  },
  {
    name: 'mainnet-only configuration leaves the testnet route unavailable',
    mainnet: [{}],
    requests: [
      { path: '/rpc', status: 200, result: 'ok' },
      { path: '/', status: 200, result: 'ok' },
      { path: '/rpc/mainnet', status: 200, result: 'ok' },
      { path: '/rpc-testnet', status: 404 },
    ],
    expectedMainnetCalls: [3],
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
