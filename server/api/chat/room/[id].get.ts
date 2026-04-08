import { createError, defineEventHandler, getRouterParam } from "h3";
import { z } from "zod";
import { requireOwnerSession } from "~~/server/utils/auth";
import { db, schema } from "~~/server/utils/db";
import { eq, asc } from "drizzle-orm";
import { mapUserToUserProfile, normalizeRoomType } from "~~/server/chat/room.service";
import {
  isFileMessagePart,
  isImageMessagePart,
  isTextMessagePart,
  type MessageAttachmentSnapshot,
  type MessagePart,
  type QuotedMessageSummary,
} from "~~/shared/types/clawme";

const { roomMessages, rooms } = schema;

const paramsSchema = z.object({
  id: z.uuid(),
});

export default defineEventHandler(async (event) => {
  await requireOwnerSession(event);

  const rawId = getRouterParam(event, "id");
  const { id } = paramsSchema.parse({ id: rawId });

  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, id),
    with: {
      members: {
        with: {
          user: true,
        },
      },
      messages: {
        orderBy: [asc(roomMessages.createdAt)],
      },
    },
  });

  if (!room) {
    throw createError({
      statusCode: 404,
      statusMessage: "Chat room not found",
    });
  }

  const members = room.members.flatMap((member) =>
    member.user ? [mapUserToUserProfile(member.user)] : [],
  );
  const quotedMessageMap = new Map(
    room.messages.map((message) => [
      message.id,
      toQuotedMessageSummary(message),
    ]),
  );

  return {
    id: room.id,
    title: room.name || "",
    type: normalizeRoomType(room.type),
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
    members,
    messages: room.messages.map((m) => ({
      id: m.id,
      role: m.role,
      parts: m.parts,
      metadata: {
        userId: m.senderId,
        createdAt: m.createdAt.getTime(),
        quotedMessageId: m.quotedMessageId ?? undefined,
        quotedExcerpt: m.quotedExcerpt ?? undefined,
        quotedMessage: m.quotedMessageId
          ? withQuotedExcerpt(
            quotedMessageMap.get(m.quotedMessageId),
            m.quotedExcerpt ?? undefined,
          )
          : undefined,
      },
    })),
  };
});

function withQuotedExcerpt(
  quotedMessage: QuotedMessageSummary | undefined,
  excerpt?: string,
) {
  if (!quotedMessage) {
    return undefined;
  }

  return {
    ...quotedMessage,
    excerpt: excerpt?.trim() || quotedMessage.excerpt,
  } satisfies QuotedMessageSummary;
}

function toQuotedMessageSummary(message: {
  id: string;
  role: "user" | "assistant" | "system";
  senderId: string;
  parts: unknown;
}): QuotedMessageSummary {
  const parts = Array.isArray(message.parts) ? (message.parts as MessagePart[]) : [];
  const text = parts.find(isTextMessagePart)?.text?.trim() || undefined;
  const attachments: MessageAttachmentSnapshot[] = parts.flatMap((part) => {
    if (!isImageMessagePart(part) && !isFileMessagePart(part)) {
      return [];
    }

    return [{
      assetId: part.assetId,
      type: part.type,
      url: part.url,
      filename: part.filename,
      mediaType: part.mediaType,
      size: part.size,
      width: "width" in part ? part.width : undefined,
      height: "height" in part ? part.height : undefined,
    }];
  });

  return {
    id: message.id,
    role: message.role,
    senderId: message.senderId,
    text,
    attachments,
    excerpt: text,
  };
}
