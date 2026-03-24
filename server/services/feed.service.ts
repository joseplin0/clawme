import { and, count, desc, eq } from "drizzle-orm";
import type {
  ActorProfile,
  FeedPostRecord,
} from "~~/shared/types/clawme";
import { db, schema } from "~~/server/utils/db";

const { systemConfig, users, feedPosts } = schema;

/**
 * Get minimal public data for feed page (owner, bot, initial feed posts)
 */
export async function getFeedInitData(feedPostsLimit: number = 15) {
  const [config, ownerModel, botModel, feedPostList] = await Promise.all([
    db.query.systemConfig.findFirst({
      where: eq(systemConfig.id, "global"),
    }),
    db.query.users.findFirst({
      where: and(eq(users.type, "HUMAN"), eq(users.role, "OWNER")),
    }),
    db.query.users.findFirst({
      where: eq(users.type, "BOT"),
    }),
    db.query.feedPosts.findMany({
      with: { attachments: true },
      orderBy: [desc(feedPosts.createdAt)],
      limit: feedPostsLimit,
    }),
  ]);

  const owner: ActorProfile | null = ownerModel
    ? {
        id: ownerModel.id,
        type: ownerModel.type,
        username: ownerModel.username,
        nickname: ownerModel.nickname,
        avatar: ownerModel.avatar,
        bio: ownerModel.bio,
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
        bio: botModel.bio,
        role: botModel.role,
        catchphrase: botModel.catchphrase,
        createdAt: botModel.createdAt.toISOString(),
        updatedAt: botModel.updatedAt.toISOString(),
      }
    : null;

  const mappedFeedPosts: FeedPostRecord[] = feedPostList.map((f) => ({
    id: f.id,
    primaryAuthorId: f.authorId,
    coAuthorIds: [],
    title: f.title,
    text: f.text || "",
    context: f.context || "随笔",
    publishedLabel: f.publishedLabel || "刚刚发布",
    likeCount: f.likeCount,
    commentCount: 0,
    attachments: f.attachments.map((a) => {
      const meta = (a.meta as Record<string, unknown>) || {};
      return {
        id: a.id,
        kind: a.type as "DOCUMENT" | "IMAGE" | "LINK",
        url: a.url,
        width: meta.width as number | undefined,
        height: meta.height as number | undefined,
        title: (meta.title as string) || "",
        subtitle: (meta.subtitle as string) || "",
        icon: (meta.icon as string) || "",
        accent: (meta.accent as string) || "",
      };
    }),
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }));

  return {
    isInitialized: config?.isInitialized ?? false,
    owner,
    bot,
    feedPosts: mappedFeedPosts,
  };
}

export async function getPaginatedFeedPosts(page: number = 1, limit: number = 15) {
  const offset = (page - 1) * limit;

  const [posts, totalCount] = await Promise.all([
    db.query.feedPosts.findMany({
      with: { attachments: true },
      orderBy: [desc(feedPosts.createdAt)],
      limit,
      offset,
    }),
    db.select({ count: count() }).from(feedPosts),
  ]);

  const mappedPosts: FeedPostRecord[] = posts.map((f) => ({
    id: f.id,
    primaryAuthorId: f.authorId,
    coAuthorIds: [],
    title: f.title,
    text: f.text || "",
    context: f.context || "随笔",
    publishedLabel: f.publishedLabel || "刚刚发布",
    likeCount: f.likeCount,
    commentCount: 0,
    attachments: f.attachments.map((a) => {
      const meta = (a.meta as Record<string, unknown>) || {};
      return {
        id: a.id,
        kind: a.type as "DOCUMENT" | "IMAGE" | "LINK",
        url: a.url,
        width: meta.width as number | undefined,
        height: meta.height as number | undefined,
        title: (meta.title as string) || "",
        subtitle: (meta.subtitle as string) || "",
        icon: (meta.icon as string) || "",
        accent: (meta.accent as string) || "",
      };
    }),
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }));

  return {
    list: mappedPosts,
    pageNum: page,
    pageSize: limit,
    total: totalCount[0]?.count ?? 0,
  };
}
