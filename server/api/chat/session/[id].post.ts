import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { createError, defineEventHandler, getRouterParam, readBody } from "h3";
import { z } from "zod";
import { getOwnerSession } from "~~/server/utils/auth";
import { db, schema } from "~~/server/utils/db";
import { createModelFromProvider } from "~~/server/utils/llm";
import { eq } from "drizzle-orm";

const { users, chatSessions, chatMessages } = schema;

const paramsSchema = z.object({
  id: z.uuid(),
});

const bodySchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
  receiverId: z.uuid(),
});

export default defineEventHandler(async (event) => {
  const ownerSession = await getOwnerSession(event);
  if (!ownerSession?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const rawId = getRouterParam(event, "id");
  const { id: sessionId } = paramsSchema.parse({ id: rawId });
  const body = await readBody(event);
  const { messages, receiverId } = bodySchema.parse(body);
  const userId = ownerSession.user.id;

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

  if (!receiver?.llmProvider) {
    throw createError({
      statusCode: 400,
      statusMessage: "Receiver or LLM provider not found",
    });
  }

  const model = createModelFromProvider(receiver.llmProvider);

  // Save user message if it's a follow-up
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === "user" && messages.length > 1) {
    await db.insert(chatMessages).values({
      sessionId,
      userId,
      role: "USER",
      parts: lastMessage.parts,
      status: "DONE",
    });
  }

  // Create streaming response
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        model,
        system: `你是 ${receiver.nickname ?? "虾米"}，一个有帮助的 AI 助手。请简洁友好地回复。`,
        messages: await convertToModelMessages(messages),
      });

      writer.merge(result.toUIMessageStream());
    },
    onFinish: async ({ messages: responseMessages }) => {
      // Save assistant's response to database
      for (const message of responseMessages) {
        await db.insert(chatMessages).values({
          sessionId,
          userId: receiver.id,
          role: message.role === "assistant" ? "ASSISTANT" : "USER",
          parts: message.parts,
          status: "DONE",
        });
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
});
