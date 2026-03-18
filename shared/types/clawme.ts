export type UserType = "HUMAN" | "BOT";
export type SessionType = "DIRECT" | "GROUP";
export type MessageStatus = "GENERATING" | "DONE" | "ERROR";
export type FeedAttachmentKind = "DOCUMENT" | "IMAGE" | "LINK";

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
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageRecord {
  id: string;
  sessionId: string;
  senderId: string;
  content: string;
  status: MessageStatus;
  thinkingContent: string | null;
  replyToId: string | null;
  isImported: boolean;
  externalSource: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedAttachmentRecord {
  id: string;
  kind: FeedAttachmentKind;
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

export interface BootstrapRequest {
  ownerNickname: string;
  ownerUsername: string;
  assistantNickname: string;
  assistantRole: string;
  assistantBio: string;
  providerName: string;
  providerBaseUrl: string;
  modelId: string;
}

export interface ChatSessionResponse {
  state: ClawmeAppState;
  activeSessionId: string | null;
}

export interface ChatStreamRequest {
  prompt: string;
  sessionId?: string;
}
