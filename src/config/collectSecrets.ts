import compareSecrets from '../security/compareSecrets.js';
import type { Provider } from '../types/config/provider.js';

const collectSecrets = (providers: Provider[]): string[] => {
  const secrets = new Set<string>();

  for (const provider of providers) {
    const url = new URL(provider.url);

    secrets.add(provider.url);
    secrets.add(url.origin);

    for (const value of url.searchParams.values()) {
      if (value) {
        secrets.add(value);
      }
    }

    for (const segment of url.pathname.split('/')) {
      if (segment.length >= 16) {
        secrets.add(segment);

        try {
          secrets.add(decodeURIComponent(segment));
        } catch {
          continue;
        }
      }
    }

    for (const value of Object.values(provider.headers)) {
      secrets.add(value);

      if (value.startsWith('Bearer ')) {
        secrets.add(value.slice(7));
      }
    }
  }

  return [...secrets].sort(compareSecrets);
};

export default collectSecrets;
