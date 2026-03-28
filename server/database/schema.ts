import {
  boolean,
  index,
  integer,
  json,
  pgTable,
  primaryKey,
  foreignKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Tables
export const systemConfig = pgTable("SystemConfig", {
  id: text("id").primaryKey().default("global"),
  isInitialized: boolean("isInitialized").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// 用户表：承载真人与 Bot 的基础资料。
export const users = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { enum: ["human", "bot"] })
    .default("human")
    .notNull(),
  username: text("username").notNull().unique(),
  nickname: text("nickname").notNull(),
  avatar: text("avatar"),
  intro: text("intro"),
  role: text("role"),
  catchphrase: text("catchphrase"),
  mbti: text("mbti"),
  currentMood: text("current_mood").default("平静"),
  createdById: uuid("created_by_id"),
  passwordHash: text("password_hash"),
  apiSecret: text("api_secret").unique(),
  llmProviderId: uuid("llm_provider_id"),
  webhookUrl: text("webhook_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// ======================================
// 用户关注关系表（绝对不混淆命名）
// ======================================
export const userFollows = pgTable(
  "user_follows",
  {
    // 【发起人】谁主动发起关注 (我关注别人 → 填我的ID)
    fromUserId: uuid("from_user_id").notNull(),
    // 【目标人】被关注的人/Bot (我关注你 → 填你的ID)
    toUserId: uuid("to_user_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    intimacy: integer("intimacy").default(0).notNull(),
  },
  (table) => [
    // 复合主键：防重复关注
    primaryKey({ columns: [table.fromUserId, table.toUserId] }),
    // 索引：查「我关注了谁」
    index("idx_follows_from_user").on(table.fromUserId),
    // 索引：查「谁关注了我」
    index("idx_follows_to_user").on(table.toUserId),
    index("idx_follows_intimacy").on(table.intimacy.desc()),
    // 外键关联
    foreignKey({
      columns: [table.fromUserId],
      foreignColumns: [users.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.toUserId],
      foreignColumns: [users.id],
    }).onDelete("cascade"),
  ],
);

/**
 * 动态相关
 */

// 主动态表：承载用户发布的内容主体。
export const moments = pgTable(
  "moment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    content: text("content"),
    likeCount: integer("like_count").default(0).notNull(),
    context: text("context"),
    type: varchar("type", { enum: ["mixed", "image", "video", "diary"] })
      .default("mixed")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("moment_user_id_idx").on(table.userId),
    index("moment_created_at_idx").on(table.createdAt),
  ],
);

// 资源表：抽象图片、视频、音频、文件等可复用素材。
export const assets = pgTable(
  "asset",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", {
      enum: ["image", "video", "audio", "file", "avatar", "cover"],
    }).notNull(),
    url: text("url").notNull(),
    fileName: text("file_name"),
    size: integer("size"),
    mimeType: text("mime_type"),
    width: integer("width"),
    height: integer("height"),
    duration: integer("duration"),
    coverUrl: text("cover_url"),
    downloadCount: integer("download_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("asset_user_id_idx").on(table.userId),
    index("asset_type_idx").on(table.type),
  ],
);

// 动态与资源关联表：定义资源在动态中的用途和顺序。
export const momentAssets = pgTable(
  "moment_asset",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    momentId: uuid("moment_id")
      .notNull()
      .references(() => moments.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    usage: varchar("usage", { enum: ["media", "attachment"] }).notNull(),
    sort: integer("sort").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("moment_asset_moment_id_idx").on(table.momentId),
    index("moment_asset_asset_id_idx").on(table.assetId),
  ],
);

// 标签表：管理可复用的内容标签。
export const tags = pgTable("tag", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 动态标签关联表：维护动态与标签的多对多关系。
export const momentTags = pgTable(
  "moment_tag",
  {
    momentId: uuid("moment_id")
      .notNull()
      .references(() => moments.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.momentId, table.tagId] })],
);

// 动态点赞关联表：记录用户对动态的点赞关系。
export const momentLikes = pgTable(
  "moment_like",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    momentId: uuid("moment_id")
      .notNull()
      .references(() => moments.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.momentId] })],
);

// 动态收藏关联表：记录用户对动态的收藏关系。
export const momentCollections = pgTable(
  "moment_collection",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    momentId: uuid("moment_id")
      .notNull()
      .references(() => moments.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.momentId] })],
);

// 评论表：挂载在动态下，并支持父子回复结构。
export const comments = pgTable(
  "Comment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    content: text("content").notNull(),
    momentId: uuid("moment_id")
      .notNull()
      .references(() => moments.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("comment_moment_id_idx").on(table.momentId)],
);

/**
 * 聊天相关
 */

// 房间表：承载单聊与群聊的顶层空间。
export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: varchar("type", { enum: ["single", "group"] })
      .default("single")
      .notNull(),
    name: varchar("name", { length: 100 }),
    avatar: text("avatar"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("idx_rooms_type").on(table.type)],
);

// 房间成员表：记录用户加入的房间及房间内角色。
export const roomMembers = pgTable(
  "room_members",
  {
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { enum: ["owner", "member"] })
      .default("member")
      .notNull(),
    lastReadMessageId: uuid("last_read_message_id"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.roomId, table.userId] }),
    index("idx_room_members_room_id").on(table.roomId),
    index("idx_room_members_user_id").on(table.userId),
  ],
);

// 房间消息表：保留 AI 结构化消息 parts，不回退到纯文本 content。
export const roomMessages = pgTable(
  "room_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { enum: ["user", "assistant", "system"] })
      .default("user")
      .notNull(),
    parts: json("parts").notNull().$type<unknown[]>(),
    status: varchar("status", { enum: ["generating", "done", "error"] })
      .default("done")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_room_messages_room_id").on(table.roomId)],
);

export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: uuid("ownerId").notNull(),
  nodes: json("nodes").notNull().$type<unknown[]>(),
  edges: json("edges").notNull().$type<unknown[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const workflowTriggers = pgTable("workflow_trigger", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id").notNull(),
  type: varchar("type", {
    enum: ["manual", "schedule", "feed_event", "webhook"],
  }).notNull(),
  config: json("config").$type<Record<string, unknown>>(),
});

export const llmProviders = pgTable("LlmProvider", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  baseUrl: text("baseUrl"),
  apiKey: text("apiKey"),
  modelId: text("modelId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const mcpServers = pgTable("McpServer", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  transport: text("transport").notNull(),
  command: text("command"),
  args: json("args").$type<unknown[]>(),
  url: text("url"),
});

export const botMcpConnections = pgTable(
  "BotMcpConnection",
  {
    botId: uuid("botId").notNull(),
    mcpServerId: uuid("mcpServerId").notNull(),
  },
  (table) => [primaryKey({ columns: [table.botId, table.mcpServerId] })],
);

// Export types
export type SystemConfig = typeof systemConfig.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserFollow = typeof userFollows.$inferSelect;
export type LlmProvider = typeof llmProviders.$inferSelect;
export type NewLlmProvider = typeof llmProviders.$inferInsert;
export type McpServer = typeof mcpServers.$inferSelect;
export type BotMcpConnection = typeof botMcpConnections.$inferSelect;
export type Workflow = typeof workflows.$inferSelect;
export type WorkflowTrigger = typeof workflowTriggers.$inferSelect;
export type Moment = typeof moments.$inferSelect;
export type NewMoment = typeof moments.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type MomentAsset = typeof momentAssets.$inferSelect;
export type NewMomentAsset = typeof momentAssets.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type MomentTag = typeof momentTags.$inferSelect;
export type NewMomentTag = typeof momentTags.$inferInsert;
export type MomentLike = typeof momentLikes.$inferSelect;
export type NewMomentLike = typeof momentLikes.$inferInsert;
export type MomentCollection = typeof momentCollections.$inferSelect;
export type NewMomentCollection = typeof momentCollections.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
export type RoomMember = typeof roomMembers.$inferSelect;
export type NewRoomMember = typeof roomMembers.$inferInsert;
export type RoomMessage = typeof roomMessages.$inferSelect;
export type NewRoomMessage = typeof roomMessages.$inferInsert;
