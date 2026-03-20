import {
  boolean,
  customType,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Custom vector type for pgvector
const vector = (name: string, dimensions: number) =>
  customType<{ data: number[]; notNull: false; default: false }>({
    dataType() {
      return `vector(${dimensions})`;
    },
  })(name);

// Enums
export const userTypeEnum = pgEnum("UserType", ["HUMAN", "BOT"]);
export const triggerTypeEnum = pgEnum("TriggerType", [
  "MANUAL",
  "SCHEDULE",
  "FEED_EVENT",
  "WEBHOOK",
]);
export const attachmentTypeEnum = pgEnum("AttachmentType", [
  "IMAGE",
  "CODE",
  "DOCUMENT",
  "LINK",
  "WORKFLOW_RESULT",
]);
export const sessionTypeEnum = pgEnum("SessionType", ["DIRECT", "GROUP"]);
export const participantRoleEnum = pgEnum("ParticipantRole", [
  "OWNER",
  "ADMIN",
  "MEMBER",
]);
export const messageRoleEnum = pgEnum("MessageRole", ["USER", "ASSISTANT", "SYSTEM"]);
export const messageStatusEnum = pgEnum("MessageStatus", [
  "GENERATING",
  "DONE",
  "ERROR",
]);

// Tables
export const systemConfig = pgTable("SystemConfig", {
  id: text("id").primaryKey().default("global"),
  isInitialized: boolean("isInitialized").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const users = pgTable("User", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: userTypeEnum("type").default("HUMAN").notNull(),
  username: text("username").notNull().unique(),
  nickname: text("nickname").notNull(),
  avatar: text("avatar"),
  bio: text("bio"),
  role: text("role"),
  catchphrase: text("catchphrase"),
  mbtiTraits: json("mbtiTraits").$type<Record<string, unknown>>(),
  currentMood: text("currentMood").default("平静"),
  createdById: uuid("createdById"),
  passwordHash: text("passwordHash"),
  apiSecret: text("apiSecret").unique(),
  llmProviderId: uuid("llmProviderId"),
  webhookUrl: text("webhookUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const socialAffinities = pgTable("SocialAffinity", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: text("sourceId").notNull(),
  targetId: text("targetId").notNull(),
  score: integer("score").default(0).notNull(),
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
  (table) => ({
    pk: {
      columns: [table.botId, table.mcpServerId],
      primaryKey: true,
    },
  }),
);

export const workflows = pgTable("Workflow", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: uuid("ownerId").notNull(),
  nodes: json("nodes").notNull().$type<unknown[]>(),
  edges: json("edges").notNull().$type<unknown[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const workflowTriggers = pgTable("WorkflowTrigger", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflowId").notNull(),
  type: triggerTypeEnum("type").notNull(),
  config: json("config").$type<Record<string, unknown>>(),
});

export const feedPosts = pgTable("FeedPost", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  text: text("text"),
  authorId: uuid("authorId").notNull(),
  likeCount: integer("likeCount").default(0).notNull(),
  context: text("context").default("随笔").notNull(),
  publishedLabel: text("publishedLabel").default("刚刚").notNull(),
  embedding: vector("embedding", 1536),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const comments = pgTable("Comment", {
  id: uuid("id").primaryKey().defaultRandom(),
  content: text("content").notNull(),
  postId: uuid("postId").notNull(),
  authorId: uuid("authorId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const postAttachments = pgTable("PostAttachment", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("postId").notNull(),
  type: attachmentTypeEnum("type").notNull(),
  url: text("url"),
  content: text("content"),
  meta: json("meta").$type<Record<string, unknown>>(),
  order: integer("order").default(0).notNull(),
});

export const chatSessions = pgTable("ChatSession", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: sessionTypeEnum("type").default("DIRECT").notNull(),
  title: text("title"),
  isArchived: boolean("isArchived").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const sessionParticipants = pgTable("SessionParticipant", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("sessionId").notNull(),
  userId: uuid("userId").notNull(),
  role: participantRoleEnum("role").default("MEMBER").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export const chatMessages = pgTable("ChatMessage", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("sessionId").notNull(),
  role: messageRoleEnum("role").default("USER").notNull(),
  parts: json("parts").notNull().$type<unknown[]>(),
  status: messageStatusEnum("status").default("DONE").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Export types
export type SystemConfig = typeof systemConfig.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type SocialAffinity = typeof socialAffinities.$inferSelect;
export type LlmProvider = typeof llmProviders.$inferSelect;
export type NewLlmProvider = typeof llmProviders.$inferInsert;
export type McpServer = typeof mcpServers.$inferSelect;
export type BotMcpConnection = typeof botMcpConnections.$inferSelect;
export type Workflow = typeof workflows.$inferSelect;
export type WorkflowTrigger = typeof workflowTriggers.$inferSelect;
export type FeedPost = typeof feedPosts.$inferSelect;
export type NewFeedPost = typeof feedPosts.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type PostAttachment = typeof postAttachments.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type SessionParticipant = typeof sessionParticipants.$inferSelect;
export type NewSessionParticipant = typeof sessionParticipants.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
