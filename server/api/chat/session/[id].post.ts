import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { createError, defineEventHandler, getRouterParam, readBody } from "h3";
import { z } from "zod";
import type { MessagePart } from "~~/shared/types/clawme";
import { createAssistantMessageStream } from "~~/server/ecosystem/core/AssistantInstant";
import { createMessage } from "~~/server/services/chat.service";
import { requireOwnerSession } from "~~/server/utils/auth";
import { db, schema } from "~~/server/utils/db";
import { resolveUserLlmProvider } from "~~/server/utils/llm";
import { eq } from "drizzle-orm";

const { users, chatSessions } = schema;

const paramsSchema = z.object({
  id: z.uuid(),
});

const bodySchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
  receiverId: z.uuid(),
});

export default defineEventHandler(async (event) => {
  const ownerUser = await requireOwnerSession(event);

  const rawId = getRouterParam(event, "id");
  const { id: sessionId } = paramsSchema.parse({ id: rawId });
  const body = await readBody(event);
  const { messages, receiverId } = bodySchema.parse(body);
  const userId = ownerUser.id;

  // Verify session exists
  const chatSession = await db.query.chatSessions.findFirst({
    where: eq(chatSessions.id, sessionId),
  });

  if (!chatSession) {
    throw createError({
      statusCode: 404,
      statusMessage: "Chat session not found",
    });
  }

  // Get receiver with llmProvider
  const receiver = await db.query.users.findFirst({
    where: eq(users.id, receiverId),
    with: { llmProvider: true },
  });

  if (!receiver) {
    throw createError({
      statusCode: 400,
      statusMessage: "Receiver not found",
    });
  }

  if (receiver.type !== "BOT") {
    throw createError({
      statusCode: 400,
      statusMessage: "HTTP streaming chat only supports bot receivers",
    });
  }

  const hasProvider = await resolveUserLlmProvider(receiver);
  if (!hasProvider) {
    throw createError({
      statusCode: 400,
      statusMessage: "Receiver or LLM provider not found",
    });
  }

  const assistantReply = await createAssistantMessageStream({
    sessionId,
    assistantUser: receiver,
    modelMessages: await convertToModelMessages(messages),
  });

  // Save user message if it's a follow-up
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === "user" && messages.length > 1) {
    await createMessage({
      sessionId,
      userId,
      role: "USER",
      parts: lastMessage.parts as MessagePart[],
      status: "DONE",
    });
  }

  return createUIMessageStreamResponse({ stream: assistantReply.stream });
});
