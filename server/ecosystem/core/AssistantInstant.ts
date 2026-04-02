import { streamText, type ModelMessage } from "ai";
import { eq } from "drizzle-orm";
import {
  ChatCommandError,
  type UserWithModelConfig,
} from "~~/server/services/chat-command.service";
import { db, schema } from "~~/server/utils/db";
import {
  createModelFromConfig,
  resolveUserModelConfig,
} from "~~/server/utils/llm";

const { roomMessages } = schema;

export async function createAssistantMessageStream(input: {
  roomId: string;
  assistantUser: UserWithModelConfig;
  modelMessages: ModelMessage[];
}) {
  const modelConfig = await resolveUserModelConfig(input.assistantUser);
  if (!modelConfig) {
    throw new ChatCommandError(
      "NO_MODEL_CONFIG",
      "AI 助理未配置模型",
      input.roomId,
    );
  }

  const result = streamText({
    model: createModelFromConfig(modelConfig),
    system: createAssistantSystemPrompt(input.assistantUser),
    // 后续如果要加意愿打分或拦截，只需要改这一处。
    messages: input.modelMessages,
  });

  let resolveCompleted: (() => void) | null = null;
  let rejectCompleted: ((error: unknown) => void) | null = null;
  const completed = new Promise<void>((resolve, reject) => {
    resolveCompleted = resolve;
    rejectCompleted = reject;
  });

  return {
    stream: result.toUIMessageStream({
      messageMetadata: () => ({
        userId: input.assistantUser.id,
        createdAt: Date.now(),
      }),
      onFinish: async ({ responseMessage }) => {
        try {
          await db.insert(roomMessages).values({
            roomId: input.roomId,
            senderId: input.assistantUser.id,
            role: "assistant",
            parts: responseMessage.parts,
            status: "done",
          });
          resolveCompleted?.();
        } catch (error) {
          rejectCompleted?.(error);
          throw error;
        }
      },
    }),
    completed,
  };
}

export async function createAssistantMessageStreamFromRoom(input: {
  roomId: string;
  assistantUser: UserWithModelConfig;
}) {
  return createAssistantMessageStream({
    roomId: input.roomId,
    assistantUser: input.assistantUser,
    modelMessages: await buildRoomModelMessages(input.roomId),
  });
}

async function buildRoomModelMessages(
  roomId: string,
): Promise<ModelMessage[]> {
  const history = await db.query.roomMessages.findMany({
    where: eq(roomMessages.roomId, roomId),
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
  });

  const modelMessages: ModelMessage[] = [];

  for (const message of history) {
    const text = extractTextContent(
      Array.isArray(message.parts) ? message.parts : [],
    );

    if (!text) {
      continue;
    }

    modelMessages.push({
      role: message.role,
      content: text,
    });
  }

  return modelMessages;
}

function createAssistantSystemPrompt(
  assistantUser: Pick<UserWithModelConfig, "nickname">,
) {
  return `你是 ${assistantUser.nickname || "虾米"}，一个有帮助的 AI 助手。请简洁友好地回复。`;
}

function extractTextContent(parts: unknown[]): string {
  return parts
    .flatMap((part) => {
      if (!part || typeof part !== "object") {
        return [];
      }

      const candidate = part as { type?: string; text?: unknown };
      if (candidate.type !== "text" || typeof candidate.text !== "string") {
        return [];
      }

      const text = candidate.text.trim();
      return text ? [text] : [];
    })
    .join("\n");
}
