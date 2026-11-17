import OpenAI, { APIError } from "openai";
import { AIProviderError, type AIChatRequest, type AIProvider } from "../types.js";

export interface OpenAIProviderOptions {
  apiKey: string;
  model: string;
  baseURL?: string;
}

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  readonly defaultModel: string;
  private client: OpenAI;

  constructor(opts: OpenAIProviderOptions) {
    this.client = new OpenAI({ apiKey: opts.apiKey, baseURL: opts.baseURL, maxRetries: 2 });
    this.defaultModel = opts.model;
  }

  async *streamChat({ messages, model, signal }: AIChatRequest): AsyncIterable<string> {
    let stream;
    try {
      stream = await this.client.chat.completions.create(
        {
          model: model ?? this.defaultModel,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        },
        { signal },
      );
    } catch (err) {
      throw mapOpenAIError(err);
    }

    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) yield delta;
      }
    } catch (err) {
      if (signal?.aborted) return;
      throw mapOpenAIError(err);
    }
  }
}

function mapOpenAIError(err: unknown): AIProviderError {
  if (err instanceof APIError) {
    if (err.status === 401 || err.status === 403) {
      return new AIProviderError("AI_AUTH", "Le service d'IA a refusé l'authentification.", err);
    }
    if (err.status === 429) {
      return new AIProviderError(
        "AI_RATE_LIMITED",
        "Le service d'IA est momentanément saturé. Réessayez dans quelques instants.",
        err,
      );
    }
    if (err.status === 400) {
      return new AIProviderError("AI_BAD_REQUEST", "La requête envoyée à l'IA est invalide.", err);
    }
  }
  return new AIProviderError("AI_UNAVAILABLE", "Le service d'IA est indisponible pour le moment.", err);
}
