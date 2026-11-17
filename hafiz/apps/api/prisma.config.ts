import "dotenv/config";
import { defineConfig } from "prisma/config";

// Les migrations utilisent DIRECT_URL (connexion directe, sans pooler) si elle
// est définie — c'est recommandé avec Supabase. Sinon DATABASE_URL.
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!url && process.argv.some((a) => a === "migrate" || a === "db")) {
  console.error(
    "\n❌ DATABASE_URL est vide.\n" +
      "   Créez le fichier apps/api/.env (copie de apps/api/.env.example)\n" +
      "   et renseignez DATABASE_URL avec l'adresse de votre base PostgreSQL.\n",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: url ?? "",
  },
});
