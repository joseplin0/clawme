import { streamText, type ModelMessage } from "ai";
import { eq } from "drizzle-orm";
import { toUIMessageRole } from "~~/shared/types/clawme";
import {
  ChatCommandError,
  type UserWithProvider,
} from "~~/server/services/chat-command.service";
import { db, schema } from "~~/server/utils/db";
import {
  createModelFromProvider,
  resolveUserLlmProvider,
} from "~~/server/utils/llm";

const { chatMessages } = schema;

export async function createAssistantMessageStream(input: {
  sessionId: string;
  assistantUser: UserWithProvider;
  modelMessages: ModelMessage[];
}) {
  const provider = await resolveUserLlmProvider(input.assistantUser);
  if (!provider) {
    throw new ChatCommandError(
      "NO_LLM_PROVIDER",
      "AI 助理未配置 LLM 提供商",
      input.sessionId,
    );
  }

  const result = streamText({
    model: createModelFromProvider(provider),
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
          await db.insert(chatMessages).values({
            sessionId: input.sessionId,
            userId: input.assistantUser.id,
            role: "ASSISTANT",
            parts: responseMessage.parts,
            status: "DONE",
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

export async function createAssistantMessageStreamFromSession(input: {
  sessionId: string;
  assistantUser: UserWithProvider;
}) {
  return createAssistantMessageStream({
    sessionId: input.sessionId,
    assistantUser: input.assistantUser,
    modelMessages: await buildSessionModelMessages(input.sessionId),
  });
}

async function buildSessionModelMessages(
  sessionId: string,
): Promise<ModelMessage[]> {
  const history = await db.query.chatMessages.findMany({
    where: eq(chatMessages.sessionId, sessionId),
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
      role: toUIMessageRole(message.role),
      content: text,
    });
  }

  return modelMessages;
}

function createAssistantSystemPrompt(
  assistantUser: Pick<UserWithProvider, "nickname">,
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
