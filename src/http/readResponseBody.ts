const readResponseBody = async (response: Response, limit: number): Promise<string> => {
  if (!response.body) {
    return '';
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;

  try {
    while (true) {
      const chunk = await reader.read();

      if (chunk.done) {
        break;
      }

      bytes += chunk.value.byteLength;

      if (bytes > limit) {
        await reader.cancel();

        throw new RangeError('Provider response exceeds the configured limit.');
      }

      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks).toString('utf8');
};

export default readResponseBody;
