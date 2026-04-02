import type {
  UserProfile,
  ChatRoomRecord,
  MomentRecord,
} from "~~/shared/types/clawme";

const DEFAULT_TIMESTAMP = "2026-03-29T00:00:00.000Z";

export function createUser(
  overrides: Partial<UserProfile> = {},
): UserProfile {
  return {
    id: "user-1",
    type: "human",
    username: "lin",
    nickname: "林",
    avatar: null,
    intro: null,
    role: null,
    catchphrase: null,
    modelConfigId: null,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function createMoment(
  overrides: Partial<MomentRecord> = {},
): MomentRecord {
  return {
    id: "moment-1",
    primaryAuthorId: "user-1",
    coAuthorIds: [],
    title: "默认动态标题",
    text: "默认动态内容",
    context: "灵感",
    likeCount: 0,
    commentCount: 0,
    attachments: [],
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}

export function createRoom(
  overrides: Partial<ChatRoomRecord> = {},
): ChatRoomRecord {
  return {
    id: "room-1",
    type: "direct",
    title: "默认房间",
    memberIds: ["user-1"],
    lastMessage: "最近一条消息",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    ...overrides,
  };
}
