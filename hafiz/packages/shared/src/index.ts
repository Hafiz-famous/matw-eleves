/**
 * Contrats partagés entre l'API HAFIZ, le client Web et la future application
 * mobile (React Native / Expo). Ce paquet ne contient que des types et des
 * constantes sans dépendance : il peut être importé partout.
 */

export const APP_NAME = "HAFIZ";
export const APP_TAGLINE = "Votre Assistant IA Intelligent";

/** Limites appliquées côté API et reprises côté client pour l'UX. */
export const LIMITS = {
  MESSAGE_MAX_LENGTH: 8000,
  TITLE_MAX_LENGTH: 120,
} as const;

export type MessageRole = "user" | "assistant" | "system";

export interface UserProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ChatMessage[];
}

export interface CreateConversationBody {
  title?: string;
}

export interface UpdateConversationBody {
  title: string;
}

export interface SendMessageBody {
  content: string;
}

/** Format standard des erreurs renvoyées par l'API. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Événements Server-Sent Events envoyés par
 * `POST /api/conversations/:id/messages`.
 */
export type ChatStreamEvent =
  | { type: "user_message"; message: ChatMessage }
  | { type: "delta"; content: string }
  | { type: "assistant_message"; message: ChatMessage }
  | { type: "conversation"; conversation: ConversationSummary }
  | { type: "error"; error: { code: string; message: string } }
  | { type: "done" };
