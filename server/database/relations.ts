import { relations } from "drizzle-orm";
import {
  botMcpConnections,
  chatMessages,
  chatSessions,
  comments,
  feedPosts,
  llmProviders,
  mcpServers,
  postAttachments,
  sessionParticipants,
  users,
  workflowTriggers,
  workflows,
} from "./schema";

// User relations
export const usersRelations = relations(users, ({ one, many }) => ({
  llmProvider: one(llmProviders, {
    fields: [users.llmProviderId],
    references: [llmProviders.id],
  }),
  createdBy: one(users, {
    fields: [users.createdById],
    references: [users.id],
    relationName: "UserCreatedUsers",
  }),
  createdUsers: many(users, {
    relationName: "UserCreatedUsers",
  }),
  mcpConnections: many(botMcpConnections),
  ownedWorkflows: many(workflows, {
    relationName: "WorkflowOwner",
  }),
  participations: many(sessionParticipants),
  authoredPosts: many(feedPosts, {
    relationName: "PostAuthor",
  }),
  coAuthored: many(feedPosts, {
    relationName: "PostCoAuthors",
  }),
  comments: many(comments, {
    relationName: "CommentAuthor",
  }),
}));

// LlmProvider relations
export const llmProvidersRelations = relations(llmProviders, ({ many }) => ({
  users: many(users),
}));

// McpServer relations
export const mcpServersRelations = relations(mcpServers, ({ many }) => ({
  connections: many(botMcpConnections),
}));

// BotMcpConnection relations
export const botMcpConnectionsRelations = relations(
  botMcpConnections,
  ({ one }) => ({
    bot: one(users, {
      fields: [botMcpConnections.botId],
      references: [users.id],
    }),
    mcpServer: one(mcpServers, {
      fields: [botMcpConnections.mcpServerId],
      references: [mcpServers.id],
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

// FeedPost relations
export const feedPostsRelations = relations(feedPosts, ({ one, many }) => ({
  author: one(users, {
    fields: [feedPosts.authorId],
    references: [users.id],
    relationName: "PostAuthor",
  }),
  coAuthors: many(users, {
    relationName: "PostCoAuthors",
  }),
  attachments: many(postAttachments),
  comments: many(comments),
}));

// Comment relations
export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(feedPosts, {
    fields: [comments.postId],
    references: [feedPosts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
    relationName: "CommentAuthor",
  }),
}));

// PostAttachment relations
export const postAttachmentsRelations = relations(postAttachments, ({ one }) => ({
  post: one(feedPosts, {
    fields: [postAttachments.postId],
    references: [feedPosts.id],
  }),
}));

// ChatSession relations
export const chatSessionsRelations = relations(chatSessions, ({ many }) => ({
  participants: many(sessionParticipants),
  messages: many(chatMessages),
}));

// SessionParticipant relations
export const sessionParticipantsRelations = relations(
  sessionParticipants,
  ({ one }) => ({
    session: one(chatSessions, {
      fields: [sessionParticipants.sessionId],
      references: [chatSessions.id],
    }),
    user: one(users, {
      fields: [sessionParticipants.userId],
      references: [users.id],
    }),
  }),
);

// ChatMessage relations
export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));
