import { and, count, desc, eq } from "drizzle-orm";
import type {
  ActorProfile,
  MomentRecord,
} from "~~/shared/types/clawme";
import { db, schema } from "~~/server/utils/db";
import { mapMomentToMomentRecord } from "./moment-record.mapper";

const { moments, systemConfig, users } = schema;

/**
 * Get minimal public data for moment page (owner, bot, initial moments)
 */
export async function getMomentInitData(limit: number = 15) {
  const [config, ownerModel, botModel, momentList] = await Promise.all([
    db.query.systemConfig.findFirst({
      where: eq(systemConfig.id, "global"),
    }),
    db.query.users.findFirst({
      where: and(eq(users.type, "human"), eq(users.role, "OWNER")),
    }),
    db.query.users.findFirst({
      where: eq(users.type, "bot"),
    }),
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
    }),
  ]);

  const owner: ActorProfile | null = ownerModel
    ? {
        id: ownerModel.id,
        type: ownerModel.type,
        username: ownerModel.username,
        nickname: ownerModel.nickname,
        avatar: ownerModel.avatar,
        intro: ownerModel.intro,
        role: ownerModel.role,
        catchphrase: ownerModel.catchphrase,
        createdAt: ownerModel.createdAt.toISOString(),
        updatedAt: ownerModel.updatedAt.toISOString(),
      }
    : null;

  const bot: ActorProfile | null = botModel
    ? {
        id: botModel.id,
        type: botModel.type,
        username: botModel.username,
        nickname: botModel.nickname,
        avatar: botModel.avatar,
        intro: botModel.intro,
        role: botModel.role,
        catchphrase: botModel.catchphrase,
        createdAt: botModel.createdAt.toISOString(),
        updatedAt: botModel.updatedAt.toISOString(),
      }
    : null;

  const mappedMoments: MomentRecord[] = momentList.map(
    mapMomentToMomentRecord,
  );

  return {
    isInitialized: config?.isInitialized ?? false,
    owner,
    bot,
    moments: mappedMoments,
  };
}

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
