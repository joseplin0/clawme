import { streamText, type ModelMessage } from "ai";
import { db, schema } from "~~/server/utils/db";
import { ChatCommandError, type UserWithModelConfig } from "~~/server/services/chat-command.service";
import { createModelFromConfig, resolveUserModelConfig } from "~~/server/utils/llm";
import type { BotStreamProvider, AssistantStreamResult } from "../types";

const { roomMessages } = schema;

export class LlmBotProvider implements BotStreamProvider {
  // 处理普通的聊天大模型
  supports(botType: string) {
    // 假设普通 bot 的 type 就是 "bot" 或者为空
    return !botType || botType === "bot";
  }

  async createStream(input: {
    roomId: string;
    assistantUser: UserWithModelConfig;
    modelMessages: ModelMessage[];
  }): Promise<AssistantStreamResult> {
    const modelConfig = await resolveUserModelConfig(input.assistantUser);
    if (!modelConfig) {
      throw new ChatCommandError("NO_MODEL_CONFIG", "AI 助理未配置模型", input.roomId);
    }

    const result = streamText({
      model: createModelFromConfig(modelConfig),
      system: this.createAssistantSystemPrompt(input.assistantUser),
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

  private createAssistantSystemPrompt(assistantUser: Pick<UserWithModelConfig, "nickname">) {
    return `你是 ${assistantUser.nickname || "虾米"}，一个有帮助的 AI 助手。请简洁友好地回复。`;
  }
}