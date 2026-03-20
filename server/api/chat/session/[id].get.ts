import { createError, defineEventHandler, getRouterParam } from "h3";
import { z } from "zod";
import { requireOwnerSession } from "~~/server/utils/auth";
import { db, schema } from "~~/server/utils/db";
import { eq, asc } from "drizzle-orm";

const { chatSessions, chatMessages } = schema;

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export default defineEventHandler(async (event) => {
  await requireOwnerSession(event);

  const rawId = getRouterParam(event, "id");
  const { id } = paramsSchema.parse({ id: rawId });

  const session = await db.query.chatSessions.findFirst({
    where: eq(chatSessions.id, id),
    with: {
      messages: {
        orderBy: [asc(chatMessages.createdAt)],
      },
    },
  });

  if (!session) {
    throw createError({
      statusCode: 404,
      statusMessage: "Chat session not found",
    });
  }

  return {
    id: session.id,
    title: session.title,
    type: session.type,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    messages: session.messages.map((m) => ({
      id: m.id,
      role: m.role.toLowerCase(),
      parts: m.parts,
      createdAt: m.createdAt.toISOString(),
    })),
  };
});
