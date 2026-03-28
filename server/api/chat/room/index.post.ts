import { createError, defineEventHandler } from "h3";
import { eq } from "drizzle-orm";
import { requireOwnerSession } from "~~/server/utils/auth";
import { db, schema } from "~~/server/utils/db";

const { roomMembers, rooms, users } = schema;

export default defineEventHandler(async (event) => {
  const ownerUser = await requireOwnerSession(event);

  const [owner, bot] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, ownerUser.id),
    }),
    db.query.users.findFirst({
      where: eq(users.type, "bot"),
    }),
  ]);

  if (!owner) {
    throw createError({
      statusCode: 404,
      statusMessage: "Owner not found",
    });
  }

  const [room] = await db
    .insert(rooms)
    .values({
      type: "single",
      name: `${owner.nickname ?? "用户"} x ${bot?.nickname ?? "助手"}`,
    })
    .returning();

  if (!room) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create room",
    });
  }

  await db.insert(roomMembers).values([
    { roomId: room.id, userId: owner.id, role: "owner" },
    ...(bot ? [{ roomId: room.id, userId: bot.id, role: "member" as const }] : []),
  ]);

  return {
    id: room.id,
    title: room.name,
    type: room.type,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  };
});
