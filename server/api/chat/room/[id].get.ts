import { createError, defineEventHandler, getRouterParam } from "h3";
import { z } from "zod";
import { requireOwnerSession } from "~~/server/utils/auth";
import { db, schema } from "~~/server/utils/db";
import { eq, asc } from "drizzle-orm";
import { mapUserToActorProfile, normalizeRoomType } from "~~/server/services/room.service";

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

  const participants = room.members.flatMap((member) =>
    member.user ? [mapUserToActorProfile(member.user)] : [],
  );

  return {
    id: room.id,
    title: room.name || "",
    type: normalizeRoomType(room.type),
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
    participants,
    messages: room.messages.map((m) => ({
      id: m.id,
      role: m.role,
      parts: m.parts,
      metadata: {
        userId: m.senderId,
        createdAt: m.createdAt.getTime(),
      },
    })),
  };
});
