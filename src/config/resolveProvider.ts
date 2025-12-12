import type { Provider } from '../types/config/provider.js';
import type { ProviderInput } from '../types/config/providerInput.js';

const resolveProvider = (input: ProviderInput, environment: NodeJS.ProcessEnv): Provider => {
  const value = environment[input.urlEnv];

  if (!value) {
    throw new Error(`Missing provider URL environment variable: ${input.urlEnv}.`);
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid provider URL environment variable: ${input.urlEnv}.`);
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash
  ) {
    throw new Error(`Provider ${input.name} requires an HTTP URL without user info or fragments.`);
  }

  const headers: Record<string, string> = {};

  for (const [name, variable] of Object.entries(input.headersEnv)) {
    const header = name.toLowerCase();
    const secret = environment[variable];

    if (
      !/^[a-z0-9!#$%&'*+.^_`|~-]+$/.test(header) ||
      ['host', 'connection', 'content-length', 'transfer-encoding', 'content-type'].includes(header) ||
      !secret ||
      /[\r\n]/.test(secret)
    ) {
      throw new Error(`Invalid header configuration for provider ${input.name}.`);
    }

    headers[header] = secret;
  }

  return {
    name: input.name,
    url: url.href,
    priority: input.priority,
    headers,
    infrastructureErrors: input.infrastructureErrors ?? [],
  };
};

export default resolveProvider;
