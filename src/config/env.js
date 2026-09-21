const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  ACTOR_HEADER: z.string().default('X-Employee-Id'),
  CLOUDINARY_URL: z.string().optional(),
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
