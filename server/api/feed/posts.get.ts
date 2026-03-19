import { getPaginatedFeedPosts } from "~~/server/utils/app-state";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 15;

  return await getPaginatedFeedPosts(page, limit);
});
