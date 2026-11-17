import "dotenv/config";
import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    CORS_ORIGINS: z.string().default("http://localhost:5173"),

    DATABASE_URL: z.string().min(1, "DATABASE_URL est requis"),

    SUPABASE_URL: z.string().url("SUPABASE_URL doit être une URL valide"),
    SUPABASE_JWT_SECRET: optionalString,
    SUPABASE_SERVICE_ROLE_KEY: optionalString,
    SUPABASE_STORAGE_BUCKET: z.string().default("hafiz-files"),

    AI_PROVIDER: z.string().default("openai"),
    OPENAI_API_KEY: optionalString,
    OPENAI_MODEL: z.string().default("gpt-4o-mini"),
    OPENAI_BASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
    AI_MAX_HISTORY_MESSAGES: z.coerce.number().int().min(1).max(200).default(30),
  })
  .superRefine((env, ctx) => {
    if (env.AI_PROVIDER === "openai" && !env.OPENAI_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["OPENAI_API_KEY"],
        message: "OPENAI_API_KEY est requis lorsque AI_PROVIDER=openai",
      });
    }
    if (env.AI_PROVIDER === "mock" && env.NODE_ENV === "production") {
      ctx.addIssue({
        code: "custom",
        path: ["AI_PROVIDER"],
        message: "Le fournisseur 'mock' est interdit en production",
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`❌ Configuration invalide :\n${issues}`);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();

export const corsOrigins = env.CORS_ORIGINS.split(",")
  .map((o) => o.trim())
  .filter(Boolean);
