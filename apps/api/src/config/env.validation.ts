import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3001),

    DATABASE_URL: z.string().url(),

    CENTRAL_JWT_ALG: z.enum(['RS256', 'HS256']).default('RS256'),
    CENTRAL_JWT_PUBLIC_KEY: z.string().optional(),
    CENTRAL_JWT_SECRET: z.string().optional(),
    CENTRAL_JWT_ISSUER: z.string().min(1),
    CENTRAL_JWT_AUDIENCE: z.string().min(1),

    CENTRAL_WEBHOOK_AUTH_TYPE: z.enum(['API_KEY', 'BEARER', 'BASIC']).default('API_KEY'),
    CENTRAL_WEBHOOK_AUTH_HEADER: z.string().min(1),
    CENTRAL_WEBHOOK_AUTH_VALUE: z.string().min(1),

    CENTRAL_URL: z.string().url(),
    CORS_ORIGIN: z.string().min(1),
  })
  .superRefine((env, ctx) => {
    if (env.CENTRAL_JWT_ALG === 'RS256' && !env.CENTRAL_JWT_PUBLIC_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CENTRAL_JWT_PUBLIC_KEY'],
        message: 'Obrigatório quando CENTRAL_JWT_ALG=RS256',
      });
    }
    if (env.CENTRAL_JWT_ALG === 'HS256' && !env.CENTRAL_JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CENTRAL_JWT_SECRET'],
        message: 'Obrigatório quando CENTRAL_JWT_ALG=HS256',
      });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): AppEnv {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
  }
  return parsed.data;
}
