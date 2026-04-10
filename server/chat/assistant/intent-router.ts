import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "~~/server/utils/db";
import { createStaticAssistantMessageStream } from "./persist-assistant-message";
import { assistantIntentHandlers } from "./intent-handlers";
import type {
  AssistantIntentHistoryMessage,
  AssistantIntentRouteResult,
  AssistantInvocationContext,
} from "./intent-types";

const { roomMessages } = schema;

export async function routeAssistantIntent(input: {
  roomId: string;
  assistantUser: {
    id: string;
    username: string;
  };
  triggerMessageId: string;
}): Promise<AssistantIntentRouteResult> {
  if (input.assistantUser.username !== "clawme") {
    return { kind: "pass" };
  }

  const room = await db.query.rooms.findFirst({
    where: eq(schema.rooms.id, input.roomId),
    columns: {
      type: true,
    },
  });

  if (!room || room.type !== "direct") {
    return { kind: "pass" };
  }

  const triggerMessage = await db.query.roomMessages.findFirst({
    where: and(
      eq(roomMessages.id, input.triggerMessageId),
      eq(roomMessages.roomId, input.roomId),
    ),
  });

  if (!triggerMessage) {
    return { kind: "pass" };
  }

  const recent = await db.query.roomMessages.findMany({
    where: eq(roomMessages.roomId, input.roomId),
    orderBy: [desc(roomMessages.createdAt)],
    limit: 3,
  });

  const context: AssistantInvocationContext = {
    roomId: input.roomId,
    assistantUser: input.assistantUser,
    triggerMessageId: input.triggerMessageId,
    triggerMessage: toIntentMessage(triggerMessage),
    recentMessages: recent
      .map(toIntentMessage)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime()),
  };

  for (const handler of assistantIntentHandlers) {
    const shouldHandle = await handler.match(context);
    if (!shouldHandle) {
      continue;
    }

    const decision = await handler.handle(context);
    if (decision.kind === "pass") {
      continue;
    }

    return {
      kind: "handled",
      source: `${handler.name}:${decision.kind}`,
      streamResult: createStaticAssistantMessageStream({
        roomId: input.roomId,
        assistantUserId: input.assistantUser.id,
        text: decision.text,
      }),
    };
  }

  return { kind: "pass" };
}

function toIntentMessage(
  message: typeof roomMessages.$inferSelect,
): AssistantIntentHistoryMessage {
  return {
    id: message.id,
    roomId: message.roomId,
    senderId: message.senderId,
    role: message.role,
    parts: Array.isArray(message.parts)
      ? (message.parts as AssistantIntentHistoryMessage["parts"])
      : [],
    createdAt: message.createdAt,
  };
}
