import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const startServer = async (server: Server): Promise<string> => {
  server.listen(0, '127.0.0.1');

  await once(server, 'listening');

  const address = server.address() as AddressInfo;

  return `http://127.0.0.1:${address.port}`;
};

export default startServer;
