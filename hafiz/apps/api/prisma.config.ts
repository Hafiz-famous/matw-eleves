import "dotenv/config";
import { defineConfig } from "prisma/config";

// Les migrations utilisent DIRECT_URL (connexion directe, sans pooler) si elle
// est définie — c'est recommandé avec Supabase. Sinon DATABASE_URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
