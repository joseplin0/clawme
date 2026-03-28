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

/** 系统初始化与全局状态配置。 */
export const systemConfig = pgTable("SystemConfig", {
  /** 配置主键，固定为 global。 */
  id: text("id").primaryKey().default("global"),
  /** 系统是否已经完成首次引导。 */
  isInitialized: boolean("isInitialized").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/** 用户表：承载真人与 Bot 的基础资料。 */
export const users = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** 用户类型，human 或 bot。 */
  type: varchar("type", { enum: ["human", "bot"] })
    .default("human")
    .notNull(),
  username: text("username").notNull().unique(),
  nickname: text("nickname").notNull(),
  avatar: text("avatar"),
  /** 人物简介或系统提示词摘要。 */
  intro: text("intro"),
  /** 业务角色标识。 */
  role: text("role"),
  /** 人物口头禅或默认宣言。 */
  catchphrase: text("catchphrase"),
  mbti: text("mbti"),
  /** 当前情绪描述。 */
  currentMood: text("current_mood").default("平静"),
  /** 创建该用户的操作者 ID。 */
  createdById: uuid("created_by_id"),
  passwordHash: text("password_hash"),
  /** 服务端鉴权密钥。 */
  apiSecret: text("api_secret").unique(),
  /** 绑定的模型提供商 ID。 */
  llmProviderId: uuid("llm_provider_id"),
  /** 外部回调地址。 */
  webhookUrl: text("webhook_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/** 用户关注关系表，表示 from_user 关注 to_user。 */
export const userFollows = pgTable(
  "user_follows",
  {
    /** 发起关注的一方。 */
    fromUserId: uuid("from_user_id").notNull(),
    /** 被关注的一方。 */
    toUserId: uuid("to_user_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    /** 亲密度或互动强度分值。 */
    intimacy: integer("intimacy").default(0).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.fromUserId, table.toUserId] }),
    index("idx_follows_from_user").on(table.fromUserId),
    index("idx_follows_to_user").on(table.toUserId),
    index("idx_follows_intimacy").on(table.intimacy.desc()),
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

/** 主动态表：承载用户发布的内容主体。 */
export const moments = pgTable(
  "moment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    content: text("content"),
    /** 点赞数缓存。 */
    likeCount: integer("like_count").default(0).notNull(),
    /** 动态语境或来源说明。 */
    context: text("context"),
    /** 动态类型，如 mixed、image、video、diary。 */
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

/** 资源表：抽象图片、视频、音频和文件等素材。 */
export const assets = pgTable(
  "asset",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 资源类型。 */
    type: varchar("type", {
      enum: ["image", "video", "audio", "file", "avatar", "cover"],
    }).notNull(),
    url: text("url").notNull(),
    fileName: text("file_name"),
    size: integer("size"),
    mimeType: text("mime_type"),
    width: integer("width"),
    height: integer("height"),
    /** 媒体时长，单位秒或毫秒，按业务约定解释。 */
    duration: integer("duration"),
    /** 封面图地址。 */
    coverUrl: text("cover_url"),
    /** 下载次数缓存。 */
    downloadCount: integer("download_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("asset_user_id_idx").on(table.userId),
    index("asset_type_idx").on(table.type),
  ],
);

/** 动态与资源的关联表，定义资源在动态中的用途和顺序。 */
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
    /** 资源用途，如 media 或 attachment。 */
    usage: varchar("usage", { enum: ["media", "attachment"] }).notNull(),
    /** 同一动态内的展示顺序。 */
    sort: integer("sort").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("moment_asset_moment_id_idx").on(table.momentId),
    index("moment_asset_asset_id_idx").on(table.assetId),
  ],
);

/** 可复用的动态标签表。 */
export const tags = pgTable("tag", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** 动态与标签的多对多关联表。 */
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

/** 动态点赞关系表。 */
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

/** 动态收藏关系表。 */
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

/** 动态评论表，支持父子回复结构。 */
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
    /** 父评论 ID，用于回复链。 */
    parentId: uuid("parent_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("comment_moment_id_idx").on(table.momentId)],
);

/**
 * 聊天相关
 */

/** 聊天房间表，承载单聊与群聊空间。 */
export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** 房间类型，single 或 group。 */
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

/** 房间成员表，记录用户加入房间及其角色。 */
export const roomMembers = pgTable(
  "room_members",
  {
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 房间内角色，如 owner 或 member。 */
    role: varchar("role", { enum: ["owner", "member"] })
      .default("member")
      .notNull(),
    /** 最后已读消息 ID。 */
    lastReadMessageId: uuid("last_read_message_id"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.roomId, table.userId] }),
    index("idx_room_members_room_id").on(table.roomId),
    index("idx_room_members_user_id").on(table.userId),
  ],
);

/** 房间消息表，保存结构化消息 parts。 */
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
    /** 消息角色，user、assistant 或 system。 */
    role: varchar("role", { enum: ["user", "assistant", "system"] })
      .default("user")
      .notNull(),
    /** 结构化消息内容数组。 */
    parts: json("parts").notNull().$type<unknown[]>(),
    /** 消息状态，generating、done 或 error。 */
    status: varchar("status", { enum: ["generating", "done", "error"] })
      .default("done")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_room_messages_room_id").on(table.roomId)],
);

/** 工作流定义表。 */
export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: uuid("ownerId").notNull(),
  /** 节点定义数组。 */
  nodes: json("nodes").notNull().$type<unknown[]>(),
  /** 边定义数组。 */
  edges: json("edges").notNull().$type<unknown[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** 工作流触发表。 */
export const workflowTriggers = pgTable("workflow_trigger", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id").notNull(),
  /** 触发类型。 */
  type: varchar("type", {
    enum: ["manual", "schedule", "feed_event", "webhook"],
  }).notNull(),
  /** 触发配置 JSON。 */
  config: json("config").$type<Record<string, unknown>>(),
});

/** 大模型提供商配置表。 */
export const llmProviders = pgTable("LlmProvider", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** 提供商类型标识。 */
  provider: text("provider").notNull(),
  /** OpenAI 兼容接口基地址。 */
  baseUrl: text("baseUrl"),
  apiKey: text("apiKey"),
  modelId: text("modelId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** MCP 服务端配置表。 */
export const mcpServers = pgTable("McpServer", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** 传输方式。 */
  transport: text("transport").notNull(),
  /** 本地命令入口。 */
  command: text("command"),
  /** 命令参数数组。 */
  args: json("args").$type<unknown[]>(),
  url: text("url"),
});

/** Bot 与 MCP 服务的绑定关系表。 */
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
