import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    testTimeout: 20000,
    env: {
      NODE_ENV: "test",
      AI_PROVIDER: "mock",
      SUPABASE_URL: "http://localhost:54321",
      SUPABASE_JWT_SECRET: "test-secret-at-least-32-characters-long!!",
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/hafiz",
    },
  },
});
