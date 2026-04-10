import { createError, defineEventHandler, getQuery, getRouterParam } from "h3";
import { z } from "zod";
import { getUserProfileById } from "~~/server/chat/room.service";
import { getPaginatedPinsByUserId } from "~~/server/services";
import { requireOwnerSession } from "~~/server/utils/auth";

const paramsSchema = z.object({
  id: z.uuid(),
});

export default defineEventHandler(async (event) => {
  await requireOwnerSession(event);

  const rawId = getRouterParam(event, "id");
  const { id } = paramsSchema.parse({ id: rawId });

  const user = await getUserProfileById(id);
  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  const query = getQuery(event);
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(30, Math.max(1, parseInt(query.limit as string) || 12));

  return await getPaginatedPinsByUserId(id, page, limit);
});
