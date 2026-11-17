import { Router, type Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { LIMITS, type ChatStreamEvent, type ConversationDetail } from "@hafiz/shared";
import { SYSTEM_PROMPT } from "../ai/prompts.js";
import { getProvider } from "../ai/registry.js";
import { AIProviderError, type AIChatMessage } from "../ai/types.js";
import { env } from "../config/env.js";
import { toChatMessage, toConversationSummary } from "../lib/serializers.js";
import { conversationService } from "../services/conversation.service.js";

export const conversationsRouter = Router();

const IdParams = z.object({ id: z.uuid("Identifiant de conversation invalide") });
const CreateBody = z
  .object({ title: z.string().trim().max(LIMITS.TITLE_MAX_LENGTH).optional() })
  .default({});
const UpdateBody = z.object({
  title: z
    .string({ error: "Le titre est requis" })
    .trim()
    .min(1, "Le titre ne peut pas être vide")
    .max(LIMITS.TITLE_MAX_LENGTH, `Le titre ne peut pas dépasser ${LIMITS.TITLE_MAX_LENGTH} caractères`),
});
const MessageBody = z.object({
  content: z
    .string({ error: "Le message est requis" })
    .trim()
    .min(1, "Le message ne peut pas être vide")
    .max(LIMITS.MESSAGE_MAX_LENGTH, `Le message ne peut pas dépasser ${LIMITS.MESSAGE_MAX_LENGTH} caractères`),
});

const messageLimiter = rateLimit({
  windowMs: 60_000,
  limit: env.NODE_ENV === "test" ? 1000 : 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? "anonymous",
  handler: (_req, res) =>
    res.status(429).json({
      error: { code: "RATE_LIMITED", message: "Trop de messages envoyés. Patientez une minute." },
    }),
});

conversationsRouter.get("/", async (req, res) => {
  const conversations = await conversationService.list(req.user!.id);
  res.json(conversations.map(toConversationSummary));
});

conversationsRouter.post("/", async (req, res) => {
  const { title } = CreateBody.parse(req.body ?? {});
  const conversation = await conversationService.create(req.user!.id, title);
  res.status(201).json(toConversationSummary(conversation));
});

conversationsRouter.get("/:id", async (req, res) => {
  const { id } = IdParams.parse(req.params);
  const c = await conversationService.getWithMessages(req.user!.id, id);
  const body: ConversationDetail = {
    ...toConversationSummary(c),
    messages: c.messages.map(toChatMessage),
  };
  res.json(body);
});

conversationsRouter.patch("/:id", async (req, res) => {
  const { id } = IdParams.parse(req.params);
  const { title } = UpdateBody.parse(req.body);
  const conversation = await conversationService.rename(req.user!.id, id, title);
  res.json(toConversationSummary(conversation));
});

conversationsRouter.delete("/:id", async (req, res) => {
  const { id } = IdParams.parse(req.params);
  await conversationService.remove(req.user!.id, id);
  res.status(204).end();
});

/**
 * Envoie un message et diffuse la réponse de l'IA en Server-Sent Events.
 * Les erreurs de validation / d'accès sont renvoyées en JSON classique
 * AVANT l'ouverture du flux.
 */
conversationsRouter.post("/:id/messages", messageLimiter, async (req, res) => {
  const { id } = IdParams.parse(req.params);
  const { content } = MessageBody.parse(req.body);
  const userId = req.user!.id;
  const provider = getProvider();

  const { message: userMessage, conversation } = await conversationService.addUserMessage(
    userId,
    id,
    content,
  );

  res.status(200).set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) controller.abort();
  });

  send(res, { type: "user_message", message: toChatMessage(userMessage) });
  send(res, { type: "conversation", conversation: toConversationSummary(conversation) });

  const history = await conversationService.history(id);
  const aiMessages: AIChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  let answer = "";
  try {
    for await (const delta of provider.streamChat({
      messages: aiMessages,
      signal: controller.signal,
    })) {
      answer += delta;
      send(res, { type: "delta", content: delta });
    }
  } catch (err) {
    const aiErr =
      err instanceof AIProviderError
        ? err
        : new AIProviderError("AI_UNAVAILABLE", "Le service d'IA est indisponible pour le moment.", err);
    console.error(`[ai:${provider.name}]`, aiErr.code, aiErr.cause ?? aiErr.message);
    if (!controller.signal.aborted) {
      send(res, { type: "error", error: { code: aiErr.code, message: aiErr.message } });
    }
  }

  // On conserve aussi une réponse partielle (génération interrompue par l'utilisateur).
  if (answer.trim()) {
    const assistant = await conversationService.addAssistantMessage(
      id,
      answer,
      provider.name,
      provider.defaultModel,
    );
    send(res, { type: "assistant_message", message: toChatMessage(assistant) });
  }

  send(res, { type: "done" });
  res.end();
});

function send(res: Response, event: ChatStreamEvent) {
  if (res.writableEnded || res.destroyed) return;
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}
