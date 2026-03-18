import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type {
  ActorProfile,
  BootstrapRequest,
  ChatMessageRecord,
  ClawmeAppState,
  FeedAttachmentRecord,
  FeedPostRecord,
  MessageStatus,
  PublicStateResponse,
} from "~~/shared/types/clawme";

interface StoredClawmeAppState extends ClawmeAppState {
  ownerAuthToken: string | null;
  ownerPasswordHash: string | null;
  botApiSecret: string | null;
}

const STATE_FILE = resolve(process.cwd(), ".data", "clawme-state.json");

function nowIso() {
  return new Date().toISOString();
}

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function buildDefaultState(): StoredClawmeAppState {
  const now = nowIso();

  return {
    system: {
      isInitialized: false,
      createdAt: now,
      updatedAt: now,
    },
    owner: null,
    bot: null,
    providers: [],
    sessions: [],
    messages: [],
    feedPosts: [],
    ownerAuthToken: null,
    ownerPasswordHash: null,
    botApiSecret: null,
  };
}

async function ensureStateDir() {
  await mkdir(dirname(STATE_FILE), { recursive: true });
}

export async function readStoredState(): Promise<StoredClawmeAppState> {
  try {
    const content = await readFile(STATE_FILE, "utf8");
    return {
      ...buildDefaultState(),
      ...JSON.parse(content),
    } satisfies StoredClawmeAppState;
  } catch {
    return buildDefaultState();
  }
}

export async function writeStoredState(state: StoredClawmeAppState) {
  await ensureStateDir();
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

function buildActor(
  input: Pick<ActorProfile, "type" | "username" | "nickname" | "bio" | "role">,
): ActorProfile {
  const now = nowIso();

  return {
    id: randomUUID(),
    type: input.type,
    username: input.username,
    nickname: input.nickname,
    avatar: null,
    bio: input.bio,
    role: input.role,
    catchphrase:
      input.type === "BOT"
        ? `${input.nickname} 先把骨架立住。`
        : "把系统慢慢养活。",
    createdAt: now,
    updatedAt: now,
  };
}

function buildAttachment(input: Omit<FeedAttachmentRecord, "id">): FeedAttachmentRecord {
  return {
    id: randomUUID(),
    ...input,
  };
}

function buildFeedPost(
  input: Omit<FeedPostRecord, "id" | "createdAt" | "updatedAt">,
): FeedPostRecord {
  const now = nowIso();

  return {
    id: randomUUID(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
}

function sanitizeState(
  state: StoredClawmeAppState,
  isOwnerAuthenticated: boolean,
): PublicStateResponse {
  return {
    state: {
      system: state.system,
      owner: state.owner,
      bot: state.bot,
      providers: state.providers,
      sessions: state.sessions,
      messages: state.messages,
      feedPosts: state.feedPosts,
    },
    viewer: {
      isOwnerAuthenticated,
      hasBotSecret: Boolean(state.botApiSecret),
    },
  };
}

export function toPublicStateResponse(
  state: StoredClawmeAppState,
  isOwnerAuthenticated: boolean,
) {
  return sanitizeState(state, isOwnerAuthenticated);
}

export async function initializeSystem(input: BootstrapRequest) {
  const existing = await readStoredState();

  if (existing.system.isInitialized) {
    return existing;
  }

  const now = nowIso();
  const owner = buildActor({
    type: "HUMAN",
    username: input.ownerUsername,
    nickname: input.ownerNickname,
    bio: "Clawme 主理人",
    role: "OWNER",
  });
  const bot = buildActor({
    type: "BOT",
    username: "clawme",
    nickname: input.assistantNickname,
    bio: input.assistantBio,
    role: input.assistantRole,
  });
  const providerId = randomUUID();
  const sessionId = randomUUID();
  const welcomeMessageId = randomUUID();
  const feedPosts = [
    buildFeedPost({
      primaryAuthorId: bot.id,
      coAuthorIds: [],
      title: "Clawme 架构白皮书",
      text:
        "我刚刚整理了一份《Clawme 架构白皮书》，把统一身份、协作会话和生态引擎串成了一套能继续长的本地底座。欢迎在这里直接盖楼推进。",
      context: "来自架构探索组",
      publishedLabel: "刚刚发布",
      likeCount: 24,
      commentCount: 8,
      attachments: [
        buildAttachment({
          kind: "DOCUMENT",
          url: null,
          title: "Clawme 架构白皮书.pdf",
          subtitle: "PDF Document · 2.4 MB",
          icon: "i-lucide-file-text",
          accent: "from-sky-100 to-cyan-50",
        }),
      ],
    }),
    buildFeedPost({
      primaryAuthorId: owner.id,
      coAuthorIds: [bot.id],
      title: null,
      text:
        "今天我们把原型页推进成了可运行骨架。现在它已经有首次引导、共享状态、SSE 会话占位和 Prisma 接入点，不再只是展示用静态稿。",
      context: "联合呈现",
      publishedLabel: "2 小时前",
      likeCount: 13,
      commentCount: 3,
      attachments: [
        buildAttachment({
          kind: "IMAGE",
          url: null,
          title: "Phase 1 工作台预览",
          subtitle: "UI Snapshot · Seeded Preview",
          icon: "i-lucide-image",
          accent: "from-amber-100 to-rose-50",
        }),
      ],
    }),
  ];

  const nextState: StoredClawmeAppState = {
    system: {
      isInitialized: true,
      createdAt: existing.system.createdAt,
      updatedAt: now,
    },
    owner,
    bot,
    providers: [
      {
        id: providerId,
        name: input.providerName,
        provider: "OPENAI_COMPATIBLE",
        baseUrl: input.providerBaseUrl,
        modelId: input.modelId,
        createdAt: now,
      },
    ],
    sessions: [
      {
        id: sessionId,
        type: "DIRECT",
        title: `${owner.nickname} x ${bot.nickname}`,
        participantIds: [owner.id, bot.id],
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      },
    ],
    messages: [
      {
        id: welcomeMessageId,
        sessionId,
        senderId: bot.id,
        content:
          "系统已经点亮。我们先从 Phase 1 的底座开始，把引导、对话链路和数据边界稳稳立住。",
        status: "DONE",
        thinkingContent: null,
        replyToId: null,
        isImported: false,
        externalSource: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    feedPosts,
    ownerAuthToken: randomBytes(24).toString("hex"),
    ownerPasswordHash: hashPassword(input.ownerPassword),
    botApiSecret: randomBytes(24).toString("hex"),
  };

  await writeStoredState(nextState);

  return nextState;
}

export async function createMessage(input: {
  sessionId: string;
  senderId: string;
  content: string;
  status?: MessageStatus;
  thinkingContent?: string | null;
}) {
  const state = await readStoredState();
  const now = nowIso();

  const message: ChatMessageRecord = {
    id: randomUUID(),
    sessionId: input.sessionId,
    senderId: input.senderId,
    content: input.content,
    status: input.status ?? "DONE",
    thinkingContent: input.thinkingContent ?? null,
    replyToId: null,
    isImported: false,
    externalSource: null,
    createdAt: now,
    updatedAt: now,
  };

  state.messages.push(message);
  state.system.updatedAt = now;
  await writeStoredState(state);

  return message;
}

export async function updateMessage(
  messageId: string,
  updates: Partial<
    Pick<ChatMessageRecord, "content" | "status" | "thinkingContent" | "updatedAt">
  >,
) {
  const state = await readStoredState();
  const target = state.messages.find((message) => message.id === messageId);

  if (!target) {
    return null;
  }

  Object.assign(target, updates, { updatedAt: nowIso() });
  state.system.updatedAt = nowIso();
  await writeStoredState(state);

  return target;
}

export function getActiveSessionId(state: StoredClawmeAppState) {
  return state.sessions[0]?.id ?? null;
}

export function createMockAssistantReply(
  prompt: string,
  state: StoredClawmeAppState,
) {
  const assistantName = state.bot?.nickname ?? "虾米";
  const provider = state.providers[0];
  const cleanedPrompt = prompt.trim().replace(/\s+/g, " ");

  return [
    `${assistantName} 已收到，我们先把这件事压进 Clawme 的可执行轨道。`,
    `当前输入聚焦在「${cleanedPrompt.slice(0, 60)}${cleanedPrompt.length > 60 ? "..." : ""}」这件事上。`,
    "我会先稳定底座，再补业务血肉：",
    "1. 固化初始化状态与账号边界。",
    "2. 让聊天链路先具备流式占位与收尾落盘。",
    "3. 把后续数据库接入点收敛到统一仓储层。",
    provider
      ? `当前预留的模型网关是 ${provider.name} / ${provider.modelId}。等真实本地模型接上后，这条 SSE 链路可以直接替换生成器。`
      : "当前还没有模型网关配置，所以我先用可替换的 mock 生成器把服务链打通。",
  ].join("\n\n");
}
