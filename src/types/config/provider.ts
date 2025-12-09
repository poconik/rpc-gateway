import type { ProviderErrorRule } from './providerErrorRule.js';

export interface Provider {
  name: string;
  url: string;
  priority: number;
  headers: Record<string, string>;
  infrastructureErrors?: ProviderErrorRule[];
}
