import { LIMITS } from "@hafiz/shared";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";

export const DEFAULT_TITLE = "Nouvelle conversation";

/**
 * Toutes les requêtes sont filtrées par `userId` : un utilisateur ne peut
 * jamais lire, modifier ou supprimer la conversation d'un autre.
 */
export const conversationService = {
  list(userId: string) {
    return prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  },

  create(userId: string, title?: string) {
    return prisma.conversation.create({
      data: { userId, title: title?.trim() || DEFAULT_TITLE },
    });
  },

  async getOwned(userId: string, id: string) {
    const conversation = await prisma.conversation.findFirst({ where: { id, userId } });
    if (!conversation) throw AppError.notFound("Conversation introuvable");
    return conversation;
  },

  async getWithMessages(userId: string, id: string) {
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!conversation) throw AppError.notFound("Conversation introuvable");
    return conversation;
  },

  async rename(userId: string, id: string, title: string) {
    await this.getOwned(userId, id);
    return prisma.conversation.update({ where: { id }, data: { title: title.trim() } });
  },

  async remove(userId: string, id: string) {
    const { count } = await prisma.conversation.deleteMany({ where: { id, userId } });
    if (count === 0) throw AppError.notFound("Conversation introuvable");
  },

  /** Enregistre le message utilisateur et met à jour le titre si nécessaire. */
  async addUserMessage(userId: string, conversationId: string, content: string) {
    const conversation = await this.getOwned(userId, conversationId);
    const shouldRetitle = conversation.title === DEFAULT_TITLE;

    return prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: { conversationId, role: "user", content },
      });
      const updated = await tx.conversation.update({
        where: { id: conversationId },
        data: shouldRetitle ? { title: makeTitle(content) } : { updatedAt: new Date() },
      });
      return { message, conversation: updated };
    });
  },

  async addAssistantMessage(conversationId: string, content: string, provider: string, model: string) {
    return prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: { conversationId, role: "assistant", content },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { provider, model },
      });
      return message;
    });
  },

  /** Derniers messages de la conversation, du plus ancien au plus récent. */
  async history(conversationId: string) {
    const recent = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: env.AI_MAX_HISTORY_MESSAGES,
    });
    return recent.reverse();
  },
};

export function makeTitle(content: string): string {
  const oneLine = content.replace(/\s+/g, " ").trim();
  const max = Math.min(60, LIMITS.TITLE_MAX_LENGTH);
  if (oneLine.length <= max) return oneLine || DEFAULT_TITLE;
  const cut = oneLine.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 30 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}
