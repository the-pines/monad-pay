import z from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string(),
  NEXT_PUBLIC_PROJECT_ID: z.string(),
});

const env = EnvSchema.parse(process.env);

export const config = {
  projectId: env.NEXT_PUBLIC_PROJECT_ID,
  databaseUrl: env.DATABASE_URL,
};
