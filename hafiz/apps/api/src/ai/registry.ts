import { env } from "../config/env.js";
import { MockProvider } from "./providers/mock.js";
import { OpenAIProvider } from "./providers/openai.js";
import type { AIProvider } from "./types.js";

type ProviderFactory = () => AIProvider;

/**
 * Registre des fournisseurs d'IA. Ajouter un fournisseur = ajouter une entrée.
 * Exemple futur : anthropic: () => new AnthropicProvider({ ... })
 */
const factories: Record<string, ProviderFactory> = {
  openai: () =>
    new OpenAIProvider({
      apiKey: env.OPENAI_API_KEY ?? "",
      model: env.OPENAI_MODEL,
      baseURL: env.OPENAI_BASE_URL,
    }),
  mock: () => new MockProvider(env.NODE_ENV === "test" ? 0 : 15),
};

const instances = new Map<string, AIProvider>();

export function getProvider(name: string = env.AI_PROVIDER): AIProvider {
  const existing = instances.get(name);
  if (existing) return existing;
  const factory = factories[name];
  if (!factory) {
    throw new Error(
      `Fournisseur d'IA inconnu : "${name}". Disponibles : ${Object.keys(factories).join(", ")}`,
    );
  }
  const provider = factory();
  instances.set(name, provider);
  return provider;
}

export const availableProviders = () => Object.keys(factories);
