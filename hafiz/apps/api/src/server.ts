import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { getProvider } from "./ai/registry.js";
import { prisma } from "./lib/prisma.js";

const provider = getProvider();
const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`✅ API HAFIZ démarrée sur http://localhost:${env.PORT} (IA : ${provider.name})`);
});

async function shutdown(signal: string) {
  console.log(`${signal} reçu, arrêt en cours…`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
