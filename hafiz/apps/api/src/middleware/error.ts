import type { ErrorRequestHandler, RequestHandler } from "express";
import type { ApiErrorBody } from "@hafiz/shared";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(AppError.notFound("Route introuvable"));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let status = 500;
  let body: ApiErrorBody = {
    error: { code: "INTERNAL_ERROR", message: "Une erreur interne est survenue." },
  };

  if (err instanceof AppError) {
    status = err.status;
    body = { error: { code: err.code, message: err.message, details: err.details } };
  } else if (err instanceof ZodError) {
    status = 400;
    body = {
      error: {
        code: "VALIDATION_ERROR",
        message: err.issues[0]?.message ?? "Données invalides",
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    };
  } else if (err?.type === "entity.parse.failed") {
    status = 400;
    body = { error: { code: "INVALID_JSON", message: "Corps de requête JSON invalide." } };
  } else if (err?.type === "entity.too.large") {
    status = 413;
    body = { error: { code: "PAYLOAD_TOO_LARGE", message: "Requête trop volumineuse." } };
  } else {
    console.error("[error]", err);
  }

  if (res.headersSent) return;
  res.status(status).json(body);
};
