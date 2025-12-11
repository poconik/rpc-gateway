import { z } from 'zod';

const providerSchema = z.strictObject({
  name: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
  urlEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  priority: z.number().int().nonnegative(),
  enabled: z.boolean().default(true),
  headersEnv: z.record(z.string(), z.string()).default({}),
  infrastructureErrors: z.array(z.strictObject({
    code: z.number().int(),
    message: z.string().min(1),
  })).default([]),
});

export default providerSchema;
