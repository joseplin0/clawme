import { count, desc } from "drizzle-orm";
import type { MomentRecord } from "~~/shared/types/clawme";
import { db, schema } from "~~/server/utils/db";
import { mapMomentToMomentRecord } from "./moment-record.mapper";

const { moments } = schema;

export async function getPaginatedMoments(page: number = 1, limit: number = 15) {
  const offset = (page - 1) * limit;

  const [momentList, totalCount] = await Promise.all([
    db.query.moments.findMany({
      with: {
        assets: {
          with: {
            asset: true,
          },
        },
      },
      orderBy: [desc(moments.createdAt)],
      limit,
      offset,
    }),
    db.select({ count: count() }).from(moments),
  ]);

  const mappedMoments: MomentRecord[] = momentList.map(
    mapMomentToMomentRecord,
  );

  return {
    list: mappedMoments,
    pageNum: page,
    pageSize: limit,
    total: totalCount[0]?.count ?? 0,
  };
}
