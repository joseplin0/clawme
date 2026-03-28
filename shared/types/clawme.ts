import type { UIMessage } from "ai";

export type UserType = "human" | "bot";
export type SessionType = "single" | "group";
export type DbMessageRole = "user" | "assistant" | "system";
export type MessageRole = DbMessageRole;
export type MessageStatus = "generating" | "done" | "error";
export type MomentAttachmentKind = "DOCUMENT" | "IMAGE" | "LINK";

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
  intro: string | null;
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
  owner: ActorProfile | null;
  bot: ActorProfile | null;
  providers: LlmProviderRecord[];
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
}

export interface BootstrapResponse extends PublicStateResponse {
  roomId?: string;
}

export interface BootstrapRequest {
  ownerNickname: string;
  ownerUsername: string;
  ownerPassword: string;
  assistantNickname: string;
  assistantRole: string;
  assistantIntro: string;
  providerName: string;
  providerBaseUrl: string;
  apiKey: string;
  modelId: string;
}

export interface ChatRoomState {
  owner: ActorProfile | null;
  bot: ActorProfile | null;
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
