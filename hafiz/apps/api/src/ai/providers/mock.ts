import { AIProviderError, type AIChatRequest, type AIProvider } from "../types.js";

/**
 * Fournisseur simulé, sans appel réseau. Utilisé pour le développement local
 * et les tests automatisés (AI_PROVIDER=mock). Interdit en production.
 */
export class MockProvider implements AIProvider {
  readonly name = "mock";
  readonly defaultModel = "mock-1";

  constructor(private readonly delayMs = 15) {}

  async *streamChat({ messages, signal }: AIChatRequest): AsyncIterable<string> {
    const last = [...messages].reverse().find((m) => m.role === "user");
    const prompt = last?.content ?? "";
    if (prompt.includes("[[mock-error]]")) {
      throw new AIProviderError("AI_UNAVAILABLE", "Le service d'IA est indisponible pour le moment.");
    }
    const userTurns = messages.filter((m) => m.role === "user").length;
    const answer =
      `Bonjour ! Je suis **HAFIZ**, votre assistant IA (mode démonstration).\n\n` +
      `Vous avez écrit : « ${prompt} »\n\n` +
      `Messages de votre part dans cette conversation : ${userTurns}.`;

    for (const word of answer.split(/(\s+)/)) {
      if (signal?.aborted) return;
      if (this.delayMs) await new Promise((r) => setTimeout(r, this.delayMs));
      yield word;
    }
  }
}
