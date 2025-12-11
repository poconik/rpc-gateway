import { z } from 'zod';

import providerSchema from './providerSchema.js';

const networkSchema = z.strictObject({
  providers: z.array(providerSchema).min(1),
});

const configSchema = z.strictObject({
  host: z.string().min(1).default('127.0.0.1'),
  port: z.number().int().min(1).max(65535).default(3000),
  attemptTimeoutMs: z.number().int().min(1).max(120000).default(3000),
  requestTimeoutMs: z.number().int().min(1).max(120000).default(8000),
  maxAttempts: z.number().int().min(1).default(3),
  maxRequestBytes: z.number().int().min(1).max(104857600).default(1048576),
  maxResponseBytes: z.number().int().min(1).max(104857600).default(5242880),
  redactEnv: z.array(z.string().regex(/^[A-Z][A-Z0-9_]*$/)).default([]),
  networks: z.strictObject({
    mainnet: networkSchema.optional(),
    testnet: networkSchema.optional(),
  }),
});

export default configSchema;
