import type { ChatMessage, ConversationSummary, UserProfile } from "@hafiz/shared";
import type { Conversation, Message, Profile } from "../generated/prisma/client.js";

export const toConversationSummary = (c: Conversation): ConversationSummary => ({
  id: c.id,
  title: c.title,
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString(),
});

export const toChatMessage = (m: Message): ChatMessage => ({
  id: m.id,
  conversationId: m.conversationId,
  role: m.role,
  content: m.content,
  createdAt: m.createdAt.toISOString(),
});

export const toUserProfile = (p: Profile): UserProfile => ({
  id: p.id,
  email: p.email,
  displayName: p.displayName,
  createdAt: p.createdAt.toISOString(),
});
