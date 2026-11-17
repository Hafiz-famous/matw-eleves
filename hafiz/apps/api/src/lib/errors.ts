/** Erreur applicative avec code HTTP et code machine stable. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, "BAD_REQUEST", message, details);
  }
  static unauthorized(message = "Authentification requise") {
    return new AppError(401, "UNAUTHORIZED", message);
  }
  static notFound(message = "Ressource introuvable") {
    return new AppError(404, "NOT_FOUND", message);
  }
}
