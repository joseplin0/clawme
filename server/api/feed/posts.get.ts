import { getPaginatedFeedPosts, getFeedInitData } from "~~/server/services";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 15;

  const [postsData, actorsData] = await Promise.all([
    getPaginatedFeedPosts(page, limit),
    page === 1 ? getFeedInitData(0) : null, // 只在第一页获取 actors
  ]);

  return {
    ...postsData,
    actors: actorsData
      ? [actorsData.owner, actorsData.bot].filter(Boolean)
      : undefined,
  };
});
