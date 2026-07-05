import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .url('DATABASE_URL must be a valid URL')
    .startsWith('postgres', 'DATABASE_URL must start with postgres://'),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  PORT: z.coerce.number().int().positive().optional(),
  HTTP_PORT: z.coerce.number().int().positive().default(Number(process.env.PORT) || 3001),
  WS_PORT: z.coerce.number().int().positive().default(3002),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  BACKEND_URL: z.string().default('http://localhost:3001'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  CONCURRENT_SESSION_LIMIT: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_PER_USER: z.coerce.number().int().positive().default(200),
  RATE_LIMIT_PER_IP: z.coerce.number().int().positive().default(300),
  MIN_MOVE_TIME_MS: z.coerce.number().int().positive().default(100),
  SUSPICIOUS_LOGIN_THRESHOLD: z.coerce.number().int().positive().default(5),
  CACHE_TTL_DEFAULT: z.coerce.number().int().positive().default(60_000),
  CACHE_TTL_LEADERBOARD: z.coerce.number().int().positive().default(30_000),
  CACHE_TTL_SEASONS: z.coerce.number().int().positive().default(30_000),
  CACHE_TTL_PROFILE: z.coerce.number().int().positive().default(60_000),
  CACHE_TTL_TOURNAMENTS: z.coerce.number().int().positive().default(30_000),
  CACHE_TTL_ROOMS: z.coerce.number().int().positive().default(10_000),
  CACHE_TTL_TABLES: z.coerce.number().int().positive().default(5_000),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (_env) return _env;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  _env = result.data;
  return _env;
}
