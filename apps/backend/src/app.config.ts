import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV:              z.enum(['development','production','test']).default('development'),
  DATABASE_URL:          z.string().min(1),
  REDIS_HOST:            z.string().default('localhost'),
  REDIS_PORT:            z.coerce.number().default(6379),
  REDIS_PASSWORD:        z.string().optional(),
  JWT_SECRET:            z.string().min(32),
  JWT_EXPIRES_IN:        z.string().default('15m'),
  JWT_REFRESH_SECRET:    z.string().min(32),
  JWT_REFRESH_EXPIRES_IN:z.string().default('7d'),
  AGENT_SECRET_SALT:     z.string().min(16),
  SMTP_HOST:             z.string().default('localhost'),
  SMTP_PORT:             z.coerce.number().default(1025),
  SMTP_SECURE:           z.coerce.boolean().default(false),
  SMTP_USER:             z.string().optional(),
  SMTP_PASS:             z.string().optional(),
  SMTP_FROM:             z.string().default('noreply@vizeye.local'),
  FRONTEND_URL:          z.string().default('http://localhost:3000'),
  THROTTLE_TTL:          z.coerce.number().default(60),
  THROTTLE_LIMIT:        z.coerce.number().default(100),
});

export type AppConfig = z.infer<typeof envSchema>;

export function validateConfig(config: Record<string, unknown>): AppConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Config validation failed:\n${result.error.toString()}`);
  }
  return result.data;
}

export function getConfig(): AppConfig {
  return validateConfig(process.env);
}
