import { once } from 'node:events';
import type { Server } from 'node:http';

const closeServer = async (server: Server): Promise<void> => {
  const closed = once(server, 'close');

  server.close();
  server.closeAllConnections();

  await closed;
};

export default closeServer;
