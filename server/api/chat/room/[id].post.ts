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
import { normalizeRoomType } from "~~/server/services/room.service";
import { requireOwnerSession } from "~~/server/utils/auth";
import { db, schema } from "~~/server/utils/db";
import { resolveUserModelConfig } from "~~/server/utils/llm";
import { eq } from "drizzle-orm";

const { rooms, users } = schema;

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
  const { id: roomId } = paramsSchema.parse({ id: rawId });
  const body = await readBody(event);
  const { messages, receiverId } = bodySchema.parse(body);
  const userId = ownerUser.id;

  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, roomId),
  });

  if (!room) {
    throw createError({
      statusCode: 404,
      statusMessage: "Chat room not found",
    });
  }

  if (normalizeRoomType(room.type) !== "direct") {
    throw createError({
      statusCode: 400,
      statusMessage: "HTTP streaming chat only supports direct rooms",
    });
  }

  const receiver = await db.query.users.findFirst({
    where: eq(users.id, receiverId),
    with: { modelConfig: true },
  });

  if (!receiver) {
    throw createError({
      statusCode: 400,
      statusMessage: "Receiver not found",
    });
  }

  if (receiver.type !== "bot") {
    throw createError({
      statusCode: 400,
      statusMessage: "HTTP streaming chat only supports bot receivers",
    });
  }

  const hasModelConfig = await resolveUserModelConfig(receiver);
  if (!hasModelConfig) {
    throw createError({
      statusCode: 400,
      statusMessage: "Receiver or model config not found",
    });
  }

  const assistantReply = await createAssistantMessageStream({
    roomId,
    assistantUser: receiver,
    modelMessages: await convertToModelMessages(messages),
  });

  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === "user" && messages.length > 1) {
    await createMessage({
      roomId,
      senderId: userId,
      role: "user",
      parts: lastMessage.parts as MessagePart[],
      status: "done",
    });
  }

  return createUIMessageStreamResponse({ stream: assistantReply.stream });
});
