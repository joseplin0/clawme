import { relations } from "drizzle-orm";
import {
  assets,
  botMcp,
  comments,
  llm,
  mcp,
  likes,
  momentAssets,
  momentCollections,
  momentTags,
  moments,
  roomMembers,
  roomMessages,
  rooms,
  tags,
  userFollows,
  users,
  workflowTriggers,
  workflows,
} from "./schema";

// User relations
export const usersRelations = relations(users, ({ one, many }) => ({
  llmProvider: one(llm, {
    fields: [users.llmProviderId],
    references: [llm.id],
  }),
  createdBy: one(users, {
    fields: [users.createdById],
    references: [users.id],
    relationName: "UserCreatedUsers",
  }),
  createdUsers: many(users, {
    relationName: "UserCreatedUsers",
  }),
  roomMemberships: many(roomMembers),
  mcpConnections: many(botMcp),
  ownedWorkflows: many(workflows, {
    relationName: "WorkflowOwner",
  }),
  moments: many(moments),
  assets: many(assets),
  likes: many(likes),
  collections: many(momentCollections),
  comments: many(comments, {
    relationName: "CommentAuthor",
  }),
  // 👇 大白话：我关注的人 / Bot
  myFollows: many(userFollows, { relationName: "fromUser" }),
  // 👇 大白话：关注我的人 / 粉丝
  followedMe: many(userFollows, { relationName: "toUser" }),
}));

// ======================================
// ✅ 关注表关系
// ======================================
export const userFollowsRelations = relations(userFollows, ({ one }) => ({
  fromUser: one(users, {
    relationName: "fromUser",
    fields: [userFollows.fromUserId],
    references: [users.id],
  }),
  toUser: one(users, {
    relationName: "toUser",
    fields: [userFollows.toUserId],
    references: [users.id],
  }),
}));

// Llm relations
export const llmRelations = relations(llm, ({ many }) => ({
  users: many(users),
}));

// Mcp relations
export const mcpRelations = relations(mcp, ({ many }) => ({
  connections: many(botMcp),
}));

// BotMcp relations
export const botMcpRelations = relations(
  botMcp,
  ({ one }) => ({
    bot: one(users, {
      fields: [botMcp.botId],
      references: [users.id],
    }),
    mcpServer: one(mcp, {
      fields: [botMcp.mcpId],
      references: [mcp.id],
    }),
  }),
);

// Workflow relations
export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  owner: one(users, {
    fields: [workflows.ownerId],
    references: [users.id],
    relationName: "WorkflowOwner",
  }),
  triggers: many(workflowTriggers),
}));

// WorkflowTrigger relations
export const workflowTriggersRelations = relations(
  workflowTriggers,
  ({ one }) => ({
    workflow: one(workflows, {
      fields: [workflowTriggers.workflowId],
      references: [workflows.id],
    }),
  }),
);

// Moment relations
export const momentsRelations = relations(moments, ({ one, many }) => ({
  user: one(users, {
    fields: [moments.userId],
    references: [users.id],
  }),
  assets: many(momentAssets),
  tags: many(momentTags),
  collections: many(momentCollections),
  comments: many(comments),
}));

// Comment relations
export const commentsRelations = relations(comments, ({ one, many }) => ({
  moment: one(moments, {
    fields: [comments.momentId],
    references: [moments.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
    relationName: "CommentAuthor",
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "CommentThread",
  }),
  replies: many(comments, {
    relationName: "CommentThread",
  }),
}));

// Like relations
export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
}));

// Asset relations
export const assetsRelations = relations(assets, ({ one, many }) => ({
  user: one(users, {
    fields: [assets.userId],
    references: [users.id],
  }),
  moments: many(momentAssets),
}));

// MomentAsset relations
export const momentAssetsRelations = relations(momentAssets, ({ one }) => ({
  moment: one(moments, {
    fields: [momentAssets.momentId],
    references: [moments.id],
  }),
  asset: one(assets, {
    fields: [momentAssets.assetId],
    references: [assets.id],
  }),
}));

// Tag relations
export const tagsRelations = relations(tags, ({ many }) => ({
  moments: many(momentTags),
}));

// MomentTag relations
export const momentTagsRelations = relations(momentTags, ({ one }) => ({
  moment: one(moments, {
    fields: [momentTags.momentId],
    references: [moments.id],
  }),
  tag: one(tags, {
    fields: [momentTags.tagId],
    references: [tags.id],
  }),
}));

// MomentCollection relations
export const momentCollectionsRelations = relations(
  momentCollections,
  ({ one }) => ({
    user: one(users, {
      fields: [momentCollections.userId],
      references: [users.id],
    }),
    moment: one(moments, {
      fields: [momentCollections.momentId],
      references: [moments.id],
    }),
  }),
);

// Room relations
export const roomsRelations = relations(rooms, ({ many }) => ({
  members: many(roomMembers),
  messages: many(roomMessages),
}));

// RoomMember relations
export const roomMembersRelations = relations(roomMembers, ({ one }) => ({
  room: one(rooms, {
    fields: [roomMembers.roomId],
    references: [rooms.id],
  }),
  user: one(users, {
    fields: [roomMembers.userId],
    references: [users.id],
  }),
  lastReadMessage: one(roomMessages, {
    fields: [roomMembers.lastReadMessageId],
    references: [roomMessages.id],
  }),
}));

// RoomMessage relations
export const roomMessagesRelations = relations(
  roomMessages,
  ({ one, many }) => ({
    room: one(rooms, {
      fields: [roomMessages.roomId],
      references: [rooms.id],
    }),
    sender: one(users, {
      fields: [roomMessages.senderId],
      references: [users.id],
    }),
    lastReaders: many(roomMembers),
  }),
);
