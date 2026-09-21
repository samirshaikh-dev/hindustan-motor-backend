const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  ACTOR_HEADER: z.string().default('X-Employee-Id'),
  CLOUDINARY_URL: z.string().optional(),
  ADMIN_EMAIL: z.string().email('ADMIN_EMAIL must be a valid email').default('admin@example.com'),
  ADMIN_PASSWORD: z.string().min(6, 'ADMIN_PASSWORD must be at least 6 characters').default('your-secure-password'),
  JWT_SECRET: z.string().min(16).default('default-super-secret-jwt-key-change-in-production'),
  JWT_ACCESS_SECRET: z.string().min(16).default(process.env.JWT_SECRET || 'default-access-super-secret-key-change-in-prod'),
  JWT_REFRESH_SECRET: z.string().min(16).default('default-refresh-super-secret-key-change-in-prod'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  COOKIE_SECURE: z.coerce.boolean().default(process.env.NODE_ENV === 'production'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().default(1000),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formattedErrors = result.error.format();
    console.error('❌ Environment configuration error:', JSON.stringify(formattedErrors, null, 2));
    throw new Error('Invalid environment configuration');
  }
  return result.data;
};

const config = parseEnv();

module.exports = config;
