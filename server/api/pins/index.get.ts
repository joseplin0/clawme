import { getQuery } from "h3";
import { getPaginatedPins } from "~~/server/services";
import { requireOwnerSession } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const owner = await requireOwnerSession(event);

  const query = getQuery(event);
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(30, Math.max(1, parseInt(query.limit as string) || 15));

  return await getPaginatedPins(owner.id, page, limit);
});
