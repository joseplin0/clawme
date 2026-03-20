import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import {
  createError,
  defineEventHandler,
  getRouterParam,
  readBody,
} from "h3";
import { z } from "zod";
import { requireOwnerSession } from "~~/server/utils/auth";
import { db, schema } from "~~/server/utils/db";
import { getModel } from "~~/server/utils/llm";
import { eq } from "drizzle-orm";

const { chatSessions, chatMessages } = schema;

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const bodySchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
});

export default defineEventHandler(async (event) => {
  const { state } = await requireOwnerSession(event);

  const rawId = getRouterParam(event, "id");
  const { id: sessionId } = paramsSchema.parse({ id: rawId });
  const body = await readBody(event);
  const { messages } = bodySchema.parse(body);

  // Verify session exists
  const session = await db.query.chatSessions.findFirst({
    where: eq(chatSessions.id, sessionId),
  });

  if (!session) {
    throw createError({
      statusCode: 404,
      statusMessage: "Chat session not found",
    });
  }

  const model = getModel();

  // Save user message if it's a follow-up
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === "user" && messages.length > 1) {
    await db.insert(chatMessages).values({
      sessionId,
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
        system: `你是 ${state.bot?.nickname ?? "虾米"}，一个有帮助的 AI 助手。请简洁友好地回复。`,
        messages: await convertToModelMessages(messages),
      });

      writer.merge(result.toUIMessageStream());
    },
    onFinish: async ({ messages: responseMessages }) => {
      // Save assistant's response to database
      for (const message of responseMessages) {
        await db.insert(chatMessages).values({
          sessionId,
          role: message.role === "assistant" ? "ASSISTANT" : "USER",
          parts: message.parts,
          status: "DONE",
        });
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
});
