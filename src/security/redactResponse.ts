const redactResponse = (body: unknown, secrets: string[], depth: number = 0): unknown => {
  if (typeof body === 'string') {
    let output = body;

    for (const secret of secrets) {
      if (secret) {
        output = output.replaceAll(secret, '[REDACTED]');
      }
    }

    return output;
  }

  if (Array.isArray(body)) {
    const output: unknown[] = [];

    for (const value of body) {
      output.push(redactResponse(value, secrets, depth + 1));
    }

    return output;
  }

  if (body !== null && typeof body === 'object') {
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;

    for (const [key, value] of Object.entries(body)) {
      if (depth === 0 && ['id', 'jsonrpc'].includes(key)) {
        output[key] = value;

        continue;
      }

      output[key] = redactResponse(value, secrets, depth + 1);
    }

    return output;
  }

  return body;
};

export default redactResponse;
