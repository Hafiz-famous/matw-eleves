import type { MessageRole } from "@hafiz/shared";

export interface AIChatMessage {
  role: MessageRole;
  content: string;
}

export interface AIChatRequest {
  messages: AIChatMessage[];
  model?: string;
  signal?: AbortSignal;
}

/**
 * Contrat que doit respecter tout fournisseur d'IA (OpenAI, Anthropic,
 * Mistral, modèle local…). Pour en ajouter un : implémenter cette interface
 * dans `providers/` puis l'enregistrer dans `registry.ts`.
 */
export interface AIProvider {
  readonly name: string;
  readonly defaultModel: string;
  /** Génère la réponse morceau par morceau (streaming). */
  streamChat(request: AIChatRequest): AsyncIterable<string>;
}

/** Erreur normalisée renvoyée par un fournisseur d'IA. */
export class AIProviderError extends Error {
  constructor(
    public readonly code: "AI_UNAVAILABLE" | "AI_RATE_LIMITED" | "AI_AUTH" | "AI_BAD_REQUEST",
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
