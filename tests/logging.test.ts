import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import type { LogEntry } from '../src/types/logging/logEntry.js';

const checkLogging = (): void => {
  const script = [
    "import writeLog from './src/logging/writeLog.ts';",
    "writeLog('request_completed', { requestId: 'request-1' });",
    "writeLog('provider_failed', { apiKey: 'private-token', url: 'https://private.example.com', headers: { authorization: 'Bearer private-token' } }, 'error');",
  ].join('\n');

  const output = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'production', LOG_LEVEL: 'info', LOG_FORMAT: 'json' },
  });

  assert.equal(output.status, 0, output.stderr);

  const lines = output.stdout.trim().split('\n');
  const info = JSON.parse(lines[0] ?? '{}') as LogEntry;
  const error = JSON.parse(lines[1] ?? '{}') as LogEntry;

  assert.equal(lines.length, 2);
  assert.equal(info.level, 30);
  assert.equal(info.event, 'request_completed');
  assert.equal(info.requestId, 'request-1');
  assert.ok(!Number.isNaN(Date.parse(info.time)));
  assert.equal(error.level, 50);
  assert.equal(error.apiKey, '[REDACTED]');
  assert.equal(error.url, '[REDACTED]');
  assert.equal(error.headers, '[REDACTED]');
  assert.ok(!output.stdout.includes('private-token'));

  const filtered = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'production', LOG_LEVEL: 'warn', LOG_FORMAT: 'json' },
  });

  assert.equal(filtered.status, 0, filtered.stderr);
  assert.equal(filtered.stdout.trim().split('\n').length, 1);
  assert.equal((JSON.parse(filtered.stdout.trim()) as LogEntry).event, 'provider_failed');

  const pretty = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'development', LOG_LEVEL: 'info', LOG_FORMAT: 'pretty' },
  });

  assert.equal(pretty.status, 0, pretty.stderr);
  assert.match(pretty.stdout, /INFO.*request_completed/);
  assert.match(pretty.stdout, /ERROR.*provider_failed/);
  assert.ok(!pretty.stdout.includes('private-token'));
};

test('logs structured levels, tracking fields, redacted secrets, and readable development output', checkLogging);
