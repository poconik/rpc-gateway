import { setTimeout } from 'node:timers';
import type { IncomingMessage, ServerResponse } from 'node:http';

import readRequestBody from '../../src/http/readRequestBody.js';
import type { MockState } from '../../src/types/testing/mockState.js';

const handleMockRequest = async (state: MockState, request: IncomingMessage, response: ServerResponse): Promise<void> => {
  state.calls += 1;

  const body = await readRequestBody(request, 1048576);

  state.received.push(JSON.parse(body));

  if (state.disconnect) {
    response.destroy();

    return;
  }

  response.writeHead(state.status ?? 200, { 'content-type': 'application/json' });

  const text = state.rawBody ?? JSON.stringify(state.body ?? { jsonrpc: '2.0', id: 7, result: 'ok' });

  if (state.delayMs) {
    response.flushHeaders();

    const timer = setTimeout(response.end.bind(response, text, 'utf8'), state.delayMs);

    timer.unref();

    return;
  }

  response.end(text);
};

export default handleMockRequest;
