import z from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string(),
});

const env = EnvSchema.parse(process.env);

export const config = {
  databaseUrl: env.DATABASE_URL,
};
