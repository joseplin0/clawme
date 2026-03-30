import { randomBytes } from "node:crypto";
import { and, count, eq } from "drizzle-orm";
import { generateText } from "ai";
import type {
  ActorProfile,
  BootstrapRequest,
  ClawmeAppState,
  PublicStateResponse,
} from "~~/shared/types/clawme";
import { db, schema } from "~~/server/utils/db";
import { createModelFromProvider } from "~~/server/utils/llm";
import {
  isSystemInitialized,
  readSystemConfig,
  setSystemInitialized,
} from "~~/server/utils/system-config";
import { createRoomAsync, mapUserToActorProfile } from "./room.service";
import { createMessage } from "./chat.service";

const {
  assets,
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

interface PublicStateSource extends ClawmeAppState {
  botApiSecret: string | null;
}

interface InitializedSystemState extends PublicStateSource {
  ownerAuthToken: string | null;
  ownerPasswordHash: string | null;
}

export async function initializeSystem(input: BootstrapRequest) {
  if (await isSystemInitialized()) {
    return await readInitializedSystemState();
  }

  const ownerApiSecret = randomBytes(24).toString("hex");
  const ownerPasswordHash = await hashPassword(input.ownerPassword);
  const botApiSecret = randomBytes(24).toString("hex");

  const { owner, bot, provider } = await db.transaction(async (tx) => {
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

    // 1. Users (Owner + Bot)
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

    // 2. Provider
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

    if (!provider) {
      throw new Error("Failed to create provider");
    }

    await tx
      .update(users)
      .set({
        llmProviderId: provider.id,
      })
      .where(eq(users.id, bot.id));

    // 3. First Moments
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
      owner,
      bot,
      provider,
    };
  });

  await setSystemInitialized(true);

  void bootstrapDefaultRoom({
    owner,
    bot,
    provider,
  }).catch((error) => {
    console.error("Failed to bootstrap default room:", error);
  });

  return {
    system: await readSystemConfig(),
    owner: mapUserToActorProfile(owner),
    bot: mapUserToActorProfile(bot),
    providers: [mapProviderRecord(provider)],
    rooms: [],
    roomMessages: [],
    moments: [],
    ownerAuthToken: owner.apiSecret,
    ownerPasswordHash: owner.passwordHash,
    botApiSecret,
  } satisfies InitializedSystemState;
}

async function bootstrapDefaultRoom(input: {
  owner: typeof users.$inferSelect;
  bot: typeof users.$inferSelect;
  provider: typeof llm.$inferSelect;
}) {
  const room = await createRoomAsync({
    creatorId: input.owner.id,
    memberIds: [input.bot.id],
    title: `${input.owner.nickname} x ${input.bot.nickname}`,
  });

  await createMessage({
    roomId: room.id,
    senderId: input.owner.id,
    role: "user",
    parts: [{ type: "text", text: "你好" }],
    status: "done",
  });

  try {
    const model = createModelFromProvider(input.provider);
    const { text } = await generateText({
      model,
      messages: [{ role: "user", content: "你好" }],
    });

    await createMessage({
      roomId: room.id,
      senderId: input.bot.id,
      role: "assistant",
      parts: [{ type: "text", text }],
      status: "done",
    });
  } catch (error) {
    console.error("Failed to generate AI response:", error);
    await createMessage({
      roomId: room.id,
      senderId: input.bot.id,
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
}

export function toPublicStateResponse(
  state: PublicStateSource,
  isOwnerAuthenticated: boolean,
  options: {
    momentsLimit?: number;
    stats?: PublicStateResponse["stats"];
  } = {},
): PublicStateResponse {
  let initialMoments = state.moments;

  if (options.momentsLimit !== undefined) {
    initialMoments = initialMoments.slice(0, options.momentsLimit);
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
    stats: options.stats,
  };
}

export async function readBootstrapStateResponse(
  isOwnerAuthenticated: boolean,
): Promise<PublicStateResponse> {
  const [system, ownerModel, botModel, providers, roomCount, messageCount] =
    await Promise.all([
      readSystemConfig(),
      readOwnerModel(),
      readBotModel(),
      db.query.llm.findMany(),
      db.select({ count: count() }).from(rooms),
      db.select({ count: count() }).from(roomMessages),
    ]);

  return toPublicStateResponse(
    {
      system,
      owner: ownerModel ? mapUserToActorProfile(ownerModel) : null,
      bot: botModel ? mapUserToActorProfile(botModel) : null,
      providers: providers.map(mapProviderRecord),
      rooms: [],
      roomMessages: [],
      moments: [],
      botApiSecret: botModel?.apiSecret ?? null,
    },
    isOwnerAuthenticated,
    {
      stats: {
        roomCount: roomCount[0]?.count ?? 0,
        messageCount: messageCount[0]?.count ?? 0,
      },
    },
  );
}

async function readInitializedSystemState(): Promise<InitializedSystemState> {
  const [system, ownerModel, botModel, providers] = await Promise.all([
    readSystemConfig(),
    readOwnerModel(),
    readBotModel(),
    db.query.llm.findMany(),
  ]);

  return {
    system,
    owner: ownerModel ? mapUserToActorProfile(ownerModel) : null,
    bot: botModel ? mapUserToActorProfile(botModel) : null,
    providers: providers.map(mapProviderRecord),
    rooms: [],
    roomMessages: [],
    moments: [],
    ownerAuthToken: ownerModel?.apiSecret ?? null,
    ownerPasswordHash: ownerModel?.passwordHash ?? null,
    botApiSecret: botModel?.apiSecret ?? null,
  };
}

async function readOwnerModel() {
  return await db.query.users.findFirst({
    where: and(eq(users.role, "OWNER"), eq(users.type, "human")),
  });
}

async function readBotModel() {
  return await db.query.users.findFirst({
    where: eq(users.type, "bot"),
  });
}

function mapProviderRecord(provider: typeof llm.$inferSelect) {
  return {
    id: provider.id,
    name: provider.name,
    provider: provider.provider,
    baseUrl: provider.baseUrl || "",
    modelId: provider.modelId,
    createdAt: provider.createdAt.toISOString(),
  };
}
