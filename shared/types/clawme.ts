import type { UIMessage } from "ai";

export type UserType = "HUMAN" | "BOT";
export type SessionType = "DIRECT" | "GROUP";
export type DbMessageRole = "USER" | "ASSISTANT" | "SYSTEM";
export type UIMessageRole = "user" | "assistant" | "system";
export type MessageRole = DbMessageRole;
export type MessageStatus = "GENERATING" | "DONE" | "ERROR";
export type FeedAttachmentKind = "DOCUMENT" | "IMAGE" | "LINK";

const DB_TO_UI_MESSAGE_ROLE_MAP: Record<DbMessageRole, UIMessageRole> = {
  USER: "user",
  ASSISTANT: "assistant",
  SYSTEM: "system",
};

const UI_TO_DB_MESSAGE_ROLE_MAP: Record<UIMessageRole, DbMessageRole> = {
  user: "USER",
  assistant: "ASSISTANT",
  system: "SYSTEM",
};

export function toUIMessageRole(
  role: DbMessageRole | UIMessageRole,
): UIMessageRole {
  if (role in UI_TO_DB_MESSAGE_ROLE_MAP) {
    return role as UIMessageRole;
  }

  return DB_TO_UI_MESSAGE_ROLE_MAP[role as DbMessageRole];
}

export function toDbMessageRole(
  role: DbMessageRole | UIMessageRole,
): DbMessageRole {
  if (role in DB_TO_UI_MESSAGE_ROLE_MAP) {
    return role as DbMessageRole;
  }

  return UI_TO_DB_MESSAGE_ROLE_MAP[role as UIMessageRole];
}

// AI SDK message metadata
export interface MessageMetadata {
  createdAt: number;
  userId: string;
}

// AI SDK compatible message part types
export type TextPart = { type: "text"; text: string };
export type ReasoningPart = { type: "reasoning"; text: string };
export type ToolCallPart = {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
};
export type ToolResultPart = {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  result: unknown;
};
export type MessagePart =
  | TextPart
  | ReasoningPart
  | ToolCallPart
  | ToolResultPart;

export interface SystemConfigRecord {
  isInitialized: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActorProfile {
  id: string;
  type: UserType;
  username: string;
  nickname: string;
  avatar: string | null;
  bio: string | null;
  role: string | null;
  catchphrase: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LlmProviderRecord {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  modelId: string;
  createdAt: string;
}

export interface ChatSessionRecord {
  id: string;
  type: SessionType;
  title: string;
  participantIds: string[];
  isArchived: boolean;
  lastMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageRecord {
  id: string;
  sessionId: string;
  userId: string;
  role: MessageRole;
  parts: MessagePart[];
  status: MessageStatus;
  createdAt: string;
}

export interface FeedAttachmentRecord {
  id: string;
  kind: FeedAttachmentKind;
  url?: string | null;
  width?: number;
  height?: number;
  title: string;
  subtitle: string;
  icon: string;
  accent: string;
}

export interface FeedPostRecord {
  id: string;
  primaryAuthorId: string;
  coAuthorIds: string[];
  title: string | null;
  text: string;
  context: string;
  publishedLabel: string;
  likeCount: number;
  commentCount: number;
  attachments: FeedAttachmentRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface ClawmeAppState {
  system: SystemConfigRecord;
  owner: ActorProfile | null;
  bot: ActorProfile | null;
  providers: LlmProviderRecord[];
  sessions: ChatSessionRecord[];
  messages: ChatMessageRecord[];
  feedPosts: FeedPostRecord[];
}

export interface PublicStateResponse {
  state: ClawmeAppState;
  viewer: {
    isOwnerAuthenticated: boolean;
    hasBotSecret: boolean;
  };
}

export interface BootstrapResponse extends PublicStateResponse {
  sessionId?: string;
}

export interface BootstrapRequest {
  ownerNickname: string;
  ownerUsername: string;
  ownerPassword: string;
  assistantNickname: string;
  assistantRole: string;
  assistantBio: string;
  providerName: string;
  providerBaseUrl: string;
  apiKey: string;
  modelId: string;
}

export interface ChatSessionState {
  owner: ActorProfile | null;
  bot: ActorProfile | null;
  sessions: ChatSessionRecord[];
}

export interface ChatSessionResponse {
  state: ChatSessionState;
  activeSessionId: string | null;
}

// AI SDK compatible message types

export type ClawmeUIMessage = UIMessage<MessageMetadata>;

export interface ChatSessionDetailResponse {
  id: string;
  title: string;
  participants: ActorProfile[];
  messages: ClawmeUIMessage[];
}

export interface ChatStreamRequest {
  messages: Array<{
    id: string;
    role: MessageRole;
    parts: MessagePart[];
  }>;
  model?: string;
}
