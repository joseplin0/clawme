import { createError, defineEventHandler, getRouterParam } from "h3";
import { z } from "zod";
import { requireOwnerSession } from "~~/server/utils/auth";
import { getActorProfileById } from "~~/server/services/room.service";

const paramsSchema = z.object({
  id: z.uuid(),
});

export default defineEventHandler(async (event) => {
  await requireOwnerSession(event);

  const rawId = getRouterParam(event, "id");
  const { id } = paramsSchema.parse({ id: rawId });
  const actor = await getActorProfileById(id);

  if (!actor) {
    throw createError({
      statusCode: 404,
      statusMessage: "Actor not found",
    });
  }

  return actor;
});
