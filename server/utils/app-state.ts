import { createHash, randomBytes } from "node:crypto";
import type {
  ActorProfile,
  BootstrapRequest,
  ChatMessageRecord,
  ClawmeAppState,
  FeedAttachmentRecord,
  FeedPostRecord,
  MessagePart,
  MessageRole,
  MessageStatus,
  PublicStateResponse,
} from "~~/shared/types/clawme";
import { prisma } from "~~/server/utils/db";
import type { Prisma } from "@prisma/client";

interface StoredClawmeAppState extends ClawmeAppState {
  ownerAuthToken: string | null;
  ownerPasswordHash: string | null;
  botApiSecret: string | null;
}

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export async function readStoredState(): Promise<StoredClawmeAppState> {
  const [config, allUsers, providers, sessions, messages, feedPosts] =
    await Promise.all([
      prisma.systemConfig.findUnique({ where: { id: "global" } }),
      prisma.user.findMany({ where: { type: { in: ["HUMAN", "BOT"] } } }),
      prisma.llmProvider.findMany(),
      prisma.chatSession.findMany({ include: { participants: true } }),
      prisma.chatMessage.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.feedPost.findMany({
        include: { attachments: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const existingConfig = config || {
    isInitialized: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const ownerModel = allUsers.find(
    (u) => u.type === "HUMAN" && u.role === "OWNER",
  );
  const botModel = allUsers.find((u) => u.type === "BOT");

  const owner: ActorProfile | null = ownerModel
    ? {
        id: ownerModel.id,
        type: ownerModel.type,
        username: ownerModel.username,
        nickname: ownerModel.nickname,
        avatar: ownerModel.avatar,
        bio: ownerModel.bio,
        role: ownerModel.role,
        catchphrase: ownerModel.catchphrase,
        createdAt: ownerModel.createdAt.toISOString(),
        updatedAt: ownerModel.updatedAt.toISOString(),
      }
    : null;

  const bot: ActorProfile | null = botModel
    ? {
        id: botModel.id,
        type: botModel.type,
        username: botModel.username,
        nickname: botModel.nickname,
        avatar: botModel.avatar,
        bio: botModel.bio,
        role: botModel.role,
        catchphrase: botModel.catchphrase,
        createdAt: botModel.createdAt.toISOString(),
        updatedAt: botModel.updatedAt.toISOString(),
      }
    : null;

  const mappedProviders = providers.map((p) => ({
    id: p.id,
    name: p.name,
    provider: p.provider,
    baseUrl: p.baseUrl || "",
    modelId: p.modelId,
    createdAt: p.createdAt.toISOString(),
  }));

  const mappedSessions = sessions.map((s) => ({
    id: s.id,
    type: s.type,
    title: s.title || "",
    participantIds: s.participants.map((p) => p.userId),
    isArchived: s.isArchived,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  const mappedMessages: ChatMessageRecord[] = messages.map((m) => ({
    id: m.id,
    sessionId: m.sessionId,
    role: m.role as MessageRole,
    parts: (m.parts as MessagePart[]) ?? [],
    status: m.status as MessageStatus,
    createdAt: m.createdAt.toISOString(),
  }));

  const mappedFeedPosts: FeedPostRecord[] = feedPosts.map((f) => ({
    id: f.id,
    primaryAuthorId: f.authorId,
    coAuthorIds: [],
    title: f.title,
    text: f.text || "",
    context: f.context || "随笔",
    publishedLabel: f.publishedLabel || "刚刚发布",
    likeCount: f.likeCount,
    commentCount: 0,
    attachments: f.attachments.map((a) => {
      const meta = (a.meta as Record<string, unknown>) || {};
      return {
        id: a.id,
        kind: a.type as "DOCUMENT" | "IMAGE" | "LINK",
        url: a.url,
        width: meta.width as number | undefined,
        height: meta.height as number | undefined,
        title: (meta.title as string) || "",
        subtitle: (meta.subtitle as string) || "",
        icon: (meta.icon as string) || "",
        accent: (meta.accent as string) || "",
      };
    }),
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }));

  return {
    system: {
      isInitialized: existingConfig.isInitialized,
      createdAt: existingConfig.createdAt.toISOString(),
      updatedAt: existingConfig.updatedAt.toISOString(),
    },
    owner,
    bot,
    providers: mappedProviders,
    sessions: mappedSessions,
    messages: mappedMessages,
    feedPosts: mappedFeedPosts,
    ownerAuthToken: ownerModel?.apiSecret || null,
    ownerPasswordHash: ownerModel?.passwordHash || null,
    botApiSecret: botModel?.apiSecret || null,
  };
}

export async function writeStoredState(_state: StoredClawmeAppState) {
  console.warn(
    "writeStoredState is deprecated. Database mutations must use Prisma clients directly.",
  );
}

export async function initializeSystem(input: BootstrapRequest) {
  const existing = await prisma.systemConfig.findUnique({
    where: { id: "global" },
  });
  if (existing?.isInitialized) {
    return await readStoredState();
  }

  const ownerApiSecret = randomBytes(24).toString("hex");
  const ownerPasswordHash = hashPassword(input.ownerPassword);
  const botApiSecret = randomBytes(24).toString("hex");

  await prisma.$transaction(
    async (tx) => {
      // 0. Clean slate to prevent unique constraint deadlocks on retries
      await tx.postAttachment.deleteMany();
      await tx.comment.deleteMany();
      await tx.feedPost.deleteMany();
      await tx.chatMessage.deleteMany();
      await tx.sessionParticipant.deleteMany();
      await tx.chatSession.deleteMany();
      await tx.llmProvider.deleteMany();
      await tx.user.deleteMany();
      await tx.systemConfig.deleteMany();

      // 1. Config
      await tx.systemConfig.create({
        data: { id: "global", isInitialized: true },
      });

      // 2. Users (Owner + Bot)
      const owner = await tx.user.create({
        data: {
          type: "HUMAN",
          username: input.ownerUsername,
          nickname: input.ownerNickname,
          bio: "Clawme 管理员",
          role: "OWNER",
          passwordHash: ownerPasswordHash,
          apiSecret: ownerApiSecret,
          catchphrase: "把系统慢慢养活。",
        },
      });

      const bot = await tx.user.create({
        data: {
          type: "BOT",
          username: "clawme",
          nickname: input.assistantNickname,
          bio: input.assistantBio,
          role: input.assistantRole,
          apiSecret: botApiSecret,
          catchphrase: `${input.assistantNickname} 先把骨架立住。`,
        },
      });

      // 3. Provider
      await tx.llmProvider.create({
        data: {
          name: input.providerName,
          provider: "OPENAI_COMPATIBLE",
          baseUrl: input.providerBaseUrl,
          modelId: input.modelId,
        },
      });

      // 4. Chat Session
      await tx.chatSession.create({
        data: {
          type: "DIRECT",
          title: `${owner.nickname} x ${bot.nickname}`,
          participants: {
            create: [
              { userId: owner.id, role: "OWNER" },
              { userId: bot.id, role: "MEMBER" },
            ],
          },
        },
      });

      // 5. Welcome Message
      const session = await tx.chatSession.findFirst();
      if (session) {
        await tx.chatMessage.create({
          data: {
            sessionId: session.id,
            role: "ASSISTANT",
            parts: [
              {
                type: "text",
                text: "系统已经点亮。我们先从 Phase 1 的底座开始，把引导、对话链路和数据边界稳稳立住。",
              },
            ],
            status: "DONE",
          },
        });
      }

      // 6. First Posts
      await tx.feedPost.create({
        data: {
          title: "Clawme 架构白皮书",
          text: "我刚刚整理了一份《Clawme 架构白皮书》，把统一身份、协作会话和生态引擎串成了一套能继续长的本地底座。欢迎在这里直接盖楼推进。",
          authorId: bot.id,
          context: "来自架构探索组",
          publishedLabel: "刚刚发布",
          likeCount: 24,
          attachments: {
            create: [
              {
                type: "DOCUMENT",
                url: "https://picsum.photos/seed/docs/600/800",
                meta: {
                  width: 600,
                  height: 800,
                  title: "Clawme 架构白皮书.pdf",
                  subtitle: "PDF Document · 2.4 MB",
                  icon: "i-lucide-file-text",
                  accent: "from-sky-100 to-cyan-50",
                },
              },
            ],
          },
        },
      });

      await tx.feedPost.create({
        data: {
          title: "极简工作台的第一次迭代",
          text: "今天我们把原型页推进成了可运行骨架。现在它已经有首次引导、共享状态、SSE 会话占位和 Prisma 接入点，不再只是展示用静态稿。",
          authorId: owner.id,
          context: "联合呈现",
          publishedLabel: "2 小时前",
          likeCount: 13,
          attachments: {
            create: [
              {
                type: "IMAGE",
                url: "https://picsum.photos/seed/workbench/600/400",
                meta: {
                  width: 600,
                  height: 400,
                  title: "Phase 1 工作台预览",
                  subtitle: "UI Snapshot · Seeded Preview",
                  icon: "i-lucide-image",
                  accent: "from-amber-100 to-rose-50",
                },
              },
            ],
          },
        },
      });
    },
    {
      timeout: 120000,
    },
  );

  return await readStoredState();
}

export function toPublicStateResponse(
  state: StoredClawmeAppState,
  isOwnerAuthenticated: boolean,
  feedPostsLimit?: number,
): PublicStateResponse {
  let initialFeedPosts = state.feedPosts;

  if (feedPostsLimit !== undefined) {
    initialFeedPosts = initialFeedPosts.slice(0, feedPostsLimit);
  }

  return {
    state: {
      system: state.system,
      owner: state.owner,
      bot: state.bot,
      providers: state.providers,
      sessions: state.sessions,
      messages: state.messages,
      feedPosts: initialFeedPosts,
    },
    viewer: {
      isOwnerAuthenticated,
      hasBotSecret: Boolean(state.botApiSecret),
    },
  };
}

export async function createMessage(input: {
  sessionId: string;
  role: MessageRole;
  parts: MessagePart[];
  status?: MessageStatus;
}) {
  const message = await prisma.chatMessage.create({
    data: {
      sessionId: input.sessionId,
      role: input.role,
      parts: input.parts as Prisma.InputJsonValue,
      status: input.status ?? "DONE",
    },
  });

  return {
    id: message.id,
    sessionId: message.sessionId,
    role: message.role as MessageRole,
    parts: (message.parts as MessagePart[]) ?? [],
    status: message.status as MessageStatus,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function updateMessage(
  messageId: string,
  updates: Partial<Pick<ChatMessageRecord, "parts" | "status">>,
) {
  const updateData: Record<string, unknown> = {};
  if (updates.parts !== undefined) updateData.parts = updates.parts;
  if (updates.status !== undefined) updateData.status = updates.status;

  const message = await prisma.chatMessage.update({
    where: { id: messageId },
    data: updateData,
  });

  return {
    id: message.id,
    sessionId: message.sessionId,
    role: message.role as MessageRole,
    parts: (message.parts as MessagePart[]) ?? [],
    status: message.status as MessageStatus,
    createdAt: message.createdAt.toISOString(),
  };
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

export async function getPaginatedFeedPosts(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [posts, total] = await Promise.all([
    prisma.feedPost.findMany({
      skip,
      take: limit,
      include: { attachments: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.feedPost.count(),
  ]);

  const mappedFeedPosts: FeedPostRecord[] = posts.map((f) => ({
    id: f.id,
    primaryAuthorId: f.authorId,
    coAuthorIds: [],
    title: f.title,
    text: f.text || "",
    context: f.context || "随笔",
    publishedLabel: f.publishedLabel || "刚刚发布",
    likeCount: f.likeCount,
    commentCount: 0,
    attachments: f.attachments.map((a) => {
      const meta = (a.meta as Record<string, unknown>) || {};
      return {
        id: a.id,
        kind: a.type as "DOCUMENT" | "IMAGE" | "LINK",
        url: a.url,
        width: meta.width as number | undefined,
        height: meta.height as number | undefined,
        title: (meta.title as string) || "",
        subtitle: (meta.subtitle as string) || "",
        icon: (meta.icon as string) || "",
        accent: (meta.accent as string) || "",
      };
    }),
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }));

  const hasMore = skip + limit < total;
  return {
    posts: mappedFeedPosts,
    total,
    hasMore,
  };
}
