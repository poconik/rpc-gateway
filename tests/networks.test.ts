import { test } from 'node:test';

import runNetworkScenario from './helpers/runNetworkScenario.js';
import type { NetworkScenario } from '../src/types/testing/networkScenario.js';

const scenarios: NetworkScenario[] = [
  {
    name: 'browser preflight is handled locally and arbitrary RPC methods remain supported',
    networks: { 'stellar-mainnet': [{}] },
    requests: [
      {
        path: '/rpc/stellar-mainnet',
        httpMethod: 'OPTIONS',
        headers: {
          origin: 'https://app.example.com',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type, authorization, x-client-version',
        },
        status: 204,
        expectedHeaders: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'content-type, authorization, x-client-version',
          'access-control-expose-headers': 'x-request-id',
          'access-control-max-age': '600',
          vary: 'Access-Control-Request-Headers',
        },
      },
      {
        path: '/rpc/stellar-mainnet',
        headers: { origin: 'https://app.example.com' },
        method: 'arbitraryFutureRpcMethod',
        params: null,
        status: 200,
        result: 'ok',
        expectedHeaders: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'x-request-id' },
      },
    ],
    expectedCalls: { 'stellar-mainnet': [1] },
  },
  {
    name: 'preflight supports legacy routes without contacting providers',
    mainnet: [{}],
    testnet: [{}],
    requests: [
      { path: '/rpc', httpMethod: 'OPTIONS', status: 204, expectedHeaders: { 'access-control-allow-headers': 'content-type' } },
      { path: '/', httpMethod: 'OPTIONS', status: 204 },
      { path: '/rpc-testnet', httpMethod: 'OPTIONS', status: 204 },
    ],
    expectedMainnetCalls: [0],
    expectedTestnetCalls: [0],
  },
  {
    name: 'unknown preflight routes remain unavailable and unsupported HTTP methods stay rejected',
    networks: { 'stellar-mainnet': [{}] },
    requests: [
      { path: '/rpc/unknown', httpMethod: 'OPTIONS', status: 404, expectedHeaders: { 'access-control-allow-origin': '*' } },
      { path: '/rpc/stellar-mainnet', httpMethod: 'GET', status: 405, expectedHeaders: { allow: 'POST, OPTIONS', 'access-control-allow-origin': '*' } },
    ],
    expectedCalls: { 'stellar-mainnet': [0] },
  },
  {
    name: 'provider failures include CORS headers so browsers can read gateway errors',
    networks: { 'stellar-mainnet': [{ status: 503, rawBody: '' }] },
    requests: [
      { path: '/rpc/stellar-mainnet', status: 503, expectedHeaders: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'x-request-id' } },
    ],
    expectedCalls: { 'stellar-mainnet': [1] },
  },
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
