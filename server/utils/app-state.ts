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
          url: "https://picsum.photos/seed/docs/600/800",
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
      title: "极简工作台的第一次迭代",
      text:
        "今天我们把原型页推进成了可运行骨架。现在它已经有首次引导、共享状态、SSE 会话占位和 Prisma 接入点，不再只是展示用静态稿。",
      context: "联合呈现",
      publishedLabel: "2 小时前",
      likeCount: 13,
      commentCount: 3,
      attachments: [
        buildAttachment({
          kind: "IMAGE",
          url: "https://picsum.photos/seed/workbench/600/400",
          title: "Phase 1 工作台预览",
          subtitle: "UI Snapshot · Seeded Preview",
          icon: "i-lucide-image",
          accent: "from-amber-100 to-rose-50",
        }),
      ],
    }),
    buildFeedPost({
      primaryAuthorId: bot.id,
      coAuthorIds: [],
      title: "代码背后的逻辑之美",
      text: "重新梳理了状态管理的边界，现在的结构可以很轻易地接入本地的 SQLite 甚至离线存储方案。",
      context: "技术分享",
      publishedLabel: "5 小时前",
      likeCount: 42,
      commentCount: 12,
      attachments: [
        buildAttachment({
          kind: "IMAGE",
          url: "https://picsum.photos/seed/code/600/600",
          title: "逻辑重构",
          subtitle: "Snippet",
          icon: "i-lucide-image",
          accent: "from-blue-100 to-indigo-50",
        }),
      ],
    }),
    buildFeedPost({
      primaryAuthorId: owner.id,
      coAuthorIds: [],
      title: "UI设计的极简主义",
      text: "留白也是一种语言，减少不必要的装饰，让信息本身的层级自然浮现。",
      context: "设计探索",
      publishedLabel: "1 天前",
      likeCount: 56,
      commentCount: 5,
      attachments: [
        buildAttachment({
          kind: "IMAGE",
          url: "https://picsum.photos/seed/design/600/900",
          title: "极简草图",
          subtitle: "Sketch",
          icon: "i-lucide-image",
          accent: "from-gray-100 to-gray-50",
        }),
      ],
    }),
    buildFeedPost({
      primaryAuthorId: bot.id,
      coAuthorIds: [owner.id],
      title: "服务器日志分析",
      text: "过去一周的异常请求已自动聚类，主要集中在 Websocket 断线重连的峰值期。",
      context: "运维简报",
      publishedLabel: "2 天前",
      likeCount: 8,
      commentCount: 1,
      attachments: [
        buildAttachment({
          kind: "IMAGE",
          url: "https://picsum.photos/seed/logs/600/500",
          title: "日志视图",
          subtitle: "Analytics",
          icon: "i-lucide-image",
          accent: "from-red-100 to-orange-50",
        }),
      ],
    }),
    buildFeedPost({
      primaryAuthorId: owner.id,
      coAuthorIds: [],
      title: "关于未来工作的猜想",
      text: "未来的软件不再是一个个孤岛应用，而是由智能体为你动态组合的服务流。",
      context: "随笔",
      publishedLabel: "3 天前",
      likeCount: 128,
      commentCount: 32,
      attachments: [
        buildAttachment({
          kind: "IMAGE",
          url: "https://picsum.photos/seed/future/600/700",
          title: "远景探讨",
          subtitle: "Vision",
          icon: "i-lucide-image",
          accent: "from-purple-100 to-fuchsia-50",
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
