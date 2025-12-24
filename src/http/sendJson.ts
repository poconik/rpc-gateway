import type { ServerResponse } from 'node:http';

import redactResponse from '../security/redactResponse.js';

const sendJson = (response: ServerResponse, status: number, body: unknown, secrets: string[]): void => {
  if (response.destroyed || response.writableEnded) {
    return;
  }

  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });

  response.end(JSON.stringify(redactResponse(body, secrets)));
};

export default sendJson;
