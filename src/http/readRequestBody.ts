import type { IncomingMessage } from 'node:http';

const readRequestBody = async (request: IncomingMessage, limit: number, signal?: AbortSignal): Promise<string> => {
  const chunks: Buffer[] = [];
  const abort = request.destroy.bind(request, undefined);
  let bytes = 0;

  signal?.throwIfAborted();
  signal?.addEventListener('abort', abort, { once: true });

  try {
    for await (const chunk of request.iterator({ destroyOnReturn: false })) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);

      bytes += buffer.length;

      if (bytes > limit) {
        throw new RangeError('Request body exceeds the configured limit.');
      }

      chunks.push(buffer);
    }
  } finally {
    signal?.removeEventListener('abort', abort);
  }

  return Buffer.concat(chunks).toString('utf8');
};

export default readRequestBody;
