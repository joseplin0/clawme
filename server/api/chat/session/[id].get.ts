import { createError, defineEventHandler, getRouterParam } from "h3";
import { z } from "zod";
import { toUIMessageRole } from "~~/shared/types/clawme";
import { requireOwnerSession } from "~~/server/utils/auth";
import { db, schema } from "~~/server/utils/db";
import { eq, asc } from "drizzle-orm";

const { chatSessions, chatMessages } = schema;

const paramsSchema = z.object({
  id: z.uuid(),
});

export default defineEventHandler(async (event) => {
  await requireOwnerSession(event);

  const rawId = getRouterParam(event, "id");
  const { id } = paramsSchema.parse({ id: rawId });

  const session = await db.query.chatSessions.findFirst({
    where: eq(chatSessions.id, id),
    with: {
      participants: true,
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
    participants: session.participants,
    messages: session.messages.map((m) => ({
      id: m.id,
      role: toUIMessageRole(m.role),
      parts: m.parts,
      metadata: {
        userId: m.userId,
        createdAt: m.createdAt.getTime(),
      },
    })),
  };
});
