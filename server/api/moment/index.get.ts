import { getMomentInitData, getPaginatedMoments } from "~~/server/services";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 15;

  const [momentsData, actorsData] = await Promise.all([
    getPaginatedMoments(page, limit),
    page === 1 ? getMomentInitData(0) : null, // 只在第一页获取 actors
  ]);

  return {
    ...momentsData,
    actors: actorsData
      ? [actorsData.owner, actorsData.bot].filter(Boolean)
      : undefined,
  };
});
