import { createError, defineEventHandler } from "h3";
import { requireOwnerSession } from "~~/server/utils/auth";
import { db, schema } from "~~/server/utils/db";

const { chatSessions, sessionParticipants } = schema;

export default defineEventHandler(async (event) => {
  const { owner, bot } = await requireOwnerSession(event);

  // Create a new session with the bot
  const [session] = await db
    .insert(chatSessions)
    .values({
      type: "DIRECT",
      title: `${owner?.nickname ?? "用户"} x ${bot?.nickname ?? "助手"}`,
    })
    .returning();

  if (!session) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create session",
    });
  }

  // Add participants
  await db.insert(sessionParticipants).values([
    { sessionId: session.id, userId: owner!.id, role: "OWNER" },
    ...(bot ? [{ sessionId: session.id, userId: bot.id, role: "MEMBER" as const }] : []),
  ]);

  return {
    id: session.id,
    title: session.title,
    type: session.type,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
});
