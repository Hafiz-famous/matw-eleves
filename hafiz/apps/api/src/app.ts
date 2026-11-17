import cors from "cors";
import express from "express";
import helmet from "helmet";
import { APP_NAME } from "@hafiz/shared";
import { corsOrigins } from "./config/env.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { conversationsRouter } from "./routes/conversations.js";
import { meRouter } from "./routes/me.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type"],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: "64kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: APP_NAME });
  });

  app.use("/api/me", requireAuth, meRouter);
  app.use("/api/conversations", requireAuth, conversationsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
