import type { UIMessage } from "ai";

export type UserType = "human" | "bot" | "acpx";
export type SessionType = "direct" | "group";
export type DbMessageRole = "user" | "assistant" | "system";
export type MessageRole = DbMessageRole;
export type MessageStatus = "generating" | "done" | "error";
export type MomentAttachmentKind = "DOCUMENT" | "IMAGE" | "LINK";

// AI SDK message metadata
export interface MessageMetadata {
  createdAt: number;
  userId: string;
  quotedMessageId?: string;
  quotedExcerpt?: string;
  quotedMessage?: QuotedMessageSummary;
}

export interface MessageAttachmentSnapshot {
  assetId?: string;
  type: "image" | "file";
  url: string;
  filename: string;
  mediaType: string;
  size: number;
  width?: number;
  height?: number;
}

export interface QuotedMessageSummary {
  id: string;
  role: MessageRole;
  senderId: string;
  text?: string;
  attachments: MessageAttachmentSnapshot[];
  excerpt?: string;
}

// AI SDK compatible message part types
export type TextPart = { type: "text"; text: string };
export type ReasoningPart = { type: "reasoning"; text: string };
export type ImagePart = {
  type: "image";
  assetId?: string;
  url: string;
  mediaType: string;
  filename: string;
  size: number;
  width?: number;
  height?: number;
};
export type FilePart = {
  type: "file";
  assetId?: string;
  url: string;
  mediaType: string;
  filename: string;
  size: number;
};
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
  | ImagePart
  | FilePart
  | ToolCallPart
  | ToolResultPart;

export function isTextMessagePart(part: unknown): part is TextPart {
  return Boolean(
    part &&
      typeof part === "object" &&
      (part as { type?: unknown }).type === "text" &&
      typeof (part as { text?: unknown }).text === "string",
  );
}

export function isReasoningMessagePart(part: unknown): part is ReasoningPart {
  return Boolean(
    part &&
      typeof part === "object" &&
      (part as { type?: unknown }).type === "reasoning" &&
      typeof (part as { text?: unknown }).text === "string",
  );
}

export function isImageMessagePart(part: unknown): part is ImagePart {
  return Boolean(
    part &&
      typeof part === "object" &&
      (part as { type?: unknown }).type === "image" &&
      typeof (part as { url?: unknown }).url === "string" &&
      typeof (part as { filename?: unknown }).filename === "string",
  );
}

export function isFileMessagePart(part: unknown): part is FilePart {
  return Boolean(
    part &&
      typeof part === "object" &&
      (part as { type?: unknown }).type === "file" &&
      typeof (part as { url?: unknown }).url === "string" &&
      typeof (part as { filename?: unknown }).filename === "string",
  );
}

export interface SystemConfigRecord {
  isInitialized: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StartupCheckStatus = "pending" | "ok" | "warn" | "error";

export interface StartupCheckRecord {
  key: string;
  label: string;
  status: StartupCheckStatus;
  detail: string;
  startedAt: string;
  updatedAt: string;
  durationMs: number | null;
}

export interface StartupDiagnostics {
  status: StartupCheckStatus;
  ready: boolean;
  hasBlockingIssue: boolean;
  startedAt: string;
  updatedAt: string;
  checks: StartupCheckRecord[];
}

export interface SystemStatusResponse {
  isInitialized: boolean;
  startup: StartupDiagnostics;
}

export interface UserProfile {
  id: string;
  type: UserType;
  username: string;
  nickname: string;
  avatar: string | null;
  intro: string | null;
  role: string | null;
  catchphrase: string | null;
  modelConfigId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function isBotUserType(
  type: UserType | string | null | undefined,
): type is Exclude<UserType, "human"> {
  return type === "bot" || type === "acpx";
}

export interface ModelConfigRecord {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  modelId: string;
  createdAt: string;
}

export interface ChatRoomRecord {
  id: string;
  type: SessionType;
  title: string;
  memberIds: string[];
  lastMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomMessageRecord {
  id: string;
  roomId: string;
  senderId: string;
  role: MessageRole;
  parts: MessagePart[];
  status: MessageStatus;
  quotedMessageId?: string | null;
  quotedExcerpt?: string | null;
  createdAt: string;
}

export interface MomentAttachmentRecord {
  id: string;
  kind: MomentAttachmentKind;
  url?: string | null;
  width?: number;
  height?: number;
  title: string;
  subtitle: string;
  icon: string;
  accent: string;
}

export interface MomentRecord {
  id: string;
  primaryAuthorId: string;
  coAuthorIds: string[];
  title: string | null;
  text: string;
  context: string;
  likeCount: number;
  commentCount: number;
  attachments: MomentAttachmentRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface ClawmeAppState {
  system: SystemConfigRecord;
  owner: UserProfile | null;
  bot: UserProfile | null;
  modelConfigs: ModelConfigRecord[];
  rooms: ChatRoomRecord[];
  roomMessages: RoomMessageRecord[];
  moments: MomentRecord[];
}

export interface PublicStateResponse {
  state: ClawmeAppState;
  viewer: {
    isOwnerAuthenticated: boolean;
    hasBotSecret: boolean;
  };
  stats?: {
    roomCount: number;
    messageCount: number;
  };
}

export interface BootstrapResponse extends PublicStateResponse {
  roomId?: string;
}

export interface CreateRoomRequest {
  memberIds: string[];
}

export type CreateRoomResponse = ChatRoomRecord;

export interface BootstrapRequest {
  ownerNickname: string;
  ownerUsername: string;
  ownerPassword: string;
  assistantNickname: string;
  assistantRole: string;
  assistantIntro: string;
  modelConfigName: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
  modelId: string;
}

export interface CreateModelConfigRequest {
  name: string;
  provider: string;
  baseUrl?: string;
  apiKey?: string;
  modelId: string;
}

export interface UpdateModelConfigRequest {
  name?: string;
  provider?: string;
  baseUrl?: string;
  apiKey?: string;
  modelId?: string;
}

export interface UpdateUserRequest {
  nickname?: string;
  intro?: string;
  role?: string;
  modelConfigId?: string | null;
}

export interface ChatRoomState {
  owner: UserProfile | null;
  bot: UserProfile | null;
  rooms: ChatRoomRecord[];
}

export interface ChatRoomResponse {
  state: ChatRoomState;
  activeRoomId: string | null;
}

// AI SDK compatible message types

export type ClawmeUIMessage = UIMessage<MessageMetadata>;

export interface ChatRoomDetailResponse {
  id: string;
  title: string;
  members: UserProfile[];
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
