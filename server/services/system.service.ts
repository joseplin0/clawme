import { randomBytes } from "node:crypto";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { generateText } from "ai";
import type {
  ActorProfile,
  BootstrapRequest,
  RoomMessageRecord,
  ClawmeAppState,
  MomentRecord,
  MessagePart,
  MessageRole,
  MessageStatus,
  PublicStateResponse,
} from "~~/shared/types/clawme";
import { db, schema } from "~~/server/utils/db";
import { createModelFromProvider } from "~~/server/utils/llm";
import { mapMomentToMomentRecord } from "./moment-record.mapper";

const {
  assets,
  systemConfig,
  users,
  llm,
  roomMembers,
  roomMessages,
  rooms,
  comments,
  momentAssets,
  momentCollections,
  momentTags,
  likes,
  moments,
  tags,
} = schema;

export interface StoredClawmeAppState extends ClawmeAppState {
  ownerAuthToken: string | null;
  ownerPasswordHash: string | null;
  botApiSecret: string | null;
}

export async function readStoredState(): Promise<StoredClawmeAppState> {
  const [config, allUsers, providers, sessions, messages, momentList] =
    await Promise.all([
      db.query.systemConfig.findFirst({
        where: eq(systemConfig.id, "global"),
      }),
      db.query.users.findMany({
        where: inArray(users.type, ["human", "bot"]),
      }),
      db.query.llm.findMany(),
      db.query.rooms.findMany({
        with: { members: true },
      }),
      db.query.roomMessages.findMany({
        orderBy: [asc(roomMessages.createdAt)],
      }),
      db.query.moments.findMany({
        with: {
          assets: {
            with: {
              asset: true,
            },
          },
        },
        orderBy: [desc(moments.createdAt)],
      }),
    ]);

  const existingConfig = config || {
    isInitialized: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const ownerModel = allUsers.find(
    (u) => u.type === "human" && u.role === "OWNER",
  );
  const botModel = allUsers.find((u) => u.type === "bot");

  const owner: ActorProfile | null = ownerModel
    ? {
        id: ownerModel.id,
        type: ownerModel.type,
        username: ownerModel.username,
        nickname: ownerModel.nickname,
        avatar: ownerModel.avatar,
        intro: ownerModel.intro,
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
        intro: botModel.intro,
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

  const mappedRooms = sessions.map((s) => ({
    id: s.id,
    type: s.type,
    title: s.name || "",
    memberIds: s.members.map((p) => p.userId),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  const mappedRoomMessages: RoomMessageRecord[] = messages.map((m) => ({
    id: m.id,
    roomId: m.roomId,
    senderId: m.senderId,
    role: m.role as MessageRole,
    parts: (m.parts as MessagePart[]) ?? [],
    status: m.status as MessageStatus,
    createdAt: m.createdAt.toISOString(),
  }));

  const mappedMoments: MomentRecord[] = momentList.map(
    mapMomentToMomentRecord,
  );

  return {
    system: {
      isInitialized: existingConfig.isInitialized ?? false,
      createdAt: existingConfig.createdAt.toISOString(),
      updatedAt: existingConfig.updatedAt.toISOString(),
    },
    owner,
    bot,
    providers: mappedProviders,
    rooms: mappedRooms,
    roomMessages: mappedRoomMessages,
    moments: mappedMoments,
    ownerAuthToken: ownerModel?.apiSecret || null,
    ownerPasswordHash: ownerModel?.passwordHash || null,
    botApiSecret: botModel?.apiSecret || null,
  };
}

export async function initializeSystem(input: BootstrapRequest) {
  const existing = await db.query.systemConfig.findFirst({
    where: eq(systemConfig.id, "global"),
  });
  if (existing?.isInitialized) {
    return await readStoredState();
  }

  const ownerApiSecret = randomBytes(24).toString("hex");
  const ownerPasswordHash = await hashPassword(input.ownerPassword);
  const botApiSecret = randomBytes(24).toString("hex");

  // Step 1: 在事务中创建基础数据
  const { roomId, botId, provider } = await db.transaction(async (tx) => {
    // 0. Clean slate
    await tx.delete(momentAssets);
    await tx.delete(momentCollections);
    await tx.delete(likes);
    await tx.delete(momentTags);
    await tx.delete(comments);
    await tx.delete(assets);
    await tx.delete(tags);
    await tx.delete(moments);
    await tx.delete(roomMessages);
    await tx.delete(roomMembers);
    await tx.delete(rooms);
    await tx.delete(llm);
    await tx.delete(users);
    await tx.delete(systemConfig);

    // 1. Config
    await tx.insert(systemConfig).values({
      id: "global",
      isInitialized: true,
    });

    // 2. Users (Owner + Bot)
    const [owner] = await tx
      .insert(users)
      .values({
        type: "human",
        username: input.ownerUsername,
        nickname: input.ownerNickname,
        intro: "Clawme 管理员",
        role: "OWNER",
        passwordHash: ownerPasswordHash,
        apiSecret: ownerApiSecret,
        catchphrase: "把系统慢慢养活。",
      })
      .returning();

    const [bot] = await tx
      .insert(users)
      .values({
        type: "bot",
        username: "clawme",
        nickname: input.assistantNickname,
        intro: input.assistantIntro,
        role: input.assistantRole,
        apiSecret: botApiSecret,
        catchphrase: `${input.assistantNickname} 先把骨架立住。`,
      })
      .returning();

    if (!owner || !bot) {
      throw new Error("Failed to create users");
    }

    // 3. Provider
    const [provider] = await tx
      .insert(llm)
      .values({
        name: input.providerName,
        provider: "OPENAI_COMPATIBLE",
        baseUrl: input.providerBaseUrl,
        apiKey: input.apiKey,
        modelId: input.modelId,
      })
      .returning();

    // 4. Chat Room
    const [room] = await tx
      .insert(rooms)
      .values({
        type: "single",
        name: `${owner.nickname} x ${bot.nickname}`,
      })
      .returning();

    if (!room || !provider) {
      throw new Error("Failed to create room or provider");
    }

    await tx
      .update(users)
      .set({
        llmProviderId: provider.id,
      })
      .where(eq(users.id, bot.id));

    await tx.insert(roomMembers).values([
      { roomId: room.id, userId: owner.id, role: "owner" },
      { roomId: room.id, userId: bot.id, role: "member" },
    ]);

    // 5. 用户消息 "你好"
    await tx.insert(roomMessages).values({
      roomId: room.id,
      senderId: owner.id,
      role: "user",
      parts: [{ type: "text", text: "你好" }],
      status: "done",
    });

    // 6. First Moments
    const [docMoment] = await tx
      .insert(moments)
      .values({
        title: "Clawme 架构白皮书",
        content:
          "我刚刚整理了一份《Clawme 架构白皮书》，把统一身份、协作会话和生态引擎串成了一套能继续长的本地底座。欢迎在这里直接盖楼推进。",
        userId: bot.id,
        context: "来自架构探索组",
        likeCount: 24,
      })
      .returning();

    if (docMoment) {
      const [docAsset] = await tx
        .insert(assets)
        .values({
          userId: bot.id,
          type: "file",
          url: "https://picsum.photos/seed/docs/600/800",
          fileName: "Clawme 架构白皮书.pdf",
          mimeType: "application/pdf",
          width: 600,
          height: 800,
          coverUrl: "https://picsum.photos/seed/docs/600/800",
        })
        .returning();

      if (docAsset) {
        await tx.insert(momentAssets).values({
          momentId: docMoment.id,
          assetId: docAsset.id,
          usage: "attachment",
          sort: 0,
        });
      }
    }

    const [imageMoment] = await tx
      .insert(moments)
      .values({
        title: "极简工作台的第一次迭代",
        content:
          "今天我们把原型页推进成了可运行骨架。现在它已经有首次引导、共享状态、SSE 会话占位和 Prisma 接入点，不再只是展示用静态稿。",
        userId: owner.id,
        context: "联合呈现",
        likeCount: 13,
        type: "image",
      })
      .returning();

    if (imageMoment) {
      const [imageAsset] = await tx
        .insert(assets)
        .values({
          userId: owner.id,
          type: "image",
          url: "https://picsum.photos/seed/workbench/600/400",
          fileName: "Phase 1 工作台预览.png",
          mimeType: "image/png",
          width: 600,
          height: 400,
        })
        .returning();

      if (imageAsset) {
        await tx.insert(momentAssets).values({
          momentId: imageMoment.id,
          assetId: imageAsset.id,
          usage: "media",
          sort: 0,
        });
      }
    }

    return {
      roomId: room.id,
      botId: bot.id,
      provider,
    };
  });

  // Step 2: 在事务外部调用 LLM 生成响应
  try {
    const model = createModelFromProvider(provider);
    const { text } = await generateText({
      model,
      messages: [{ role: "user", content: "你好" }],
    });

    // Step 3: 存储 AI 响应
    await db.insert(roomMessages).values({
      roomId,
      senderId: botId,
      role: "assistant",
      parts: [{ type: "text", text }],
      status: "done",
    });
  } catch (error) {
    console.error("Failed to generate AI response:", error);
    // 如果 LLM 调用失败，存储一个默认响应
    await db.insert(roomMessages).values({
      roomId,
      senderId: botId,
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "系统已经点亮。我们先从 Phase 1 的底座开始，把引导、对话链路和数据边界稳稳立住。",
        },
      ],
      status: "done",
    });
  }

  return await readStoredState();
}

export function toPublicStateResponse(
  state: StoredClawmeAppState,
  isOwnerAuthenticated: boolean,
  momentsLimit?: number,
): PublicStateResponse {
  let initialMoments = state.moments;

  if (momentsLimit !== undefined) {
    initialMoments = initialMoments.slice(0, momentsLimit);
  }

  return {
    state: {
      system: state.system,
      owner: state.owner,
      bot: state.bot,
      providers: state.providers,
      rooms: state.rooms,
      roomMessages: state.roomMessages,
      moments: initialMoments,
    },
    viewer: {
      isOwnerAuthenticated,
      hasBotSecret: Boolean(state.botApiSecret),
    },
  };
}
