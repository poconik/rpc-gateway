import type { ProviderErrorRule } from './providerErrorRule.js';

export interface ProviderInput {
  name: string;
  urlEnv: string;
  priority: number;
  enabled: boolean;
  headersEnv: Record<string, string>;
  infrastructureErrors?: ProviderErrorRule[];
}
