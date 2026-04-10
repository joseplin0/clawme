import { streamText, type ModelMessage } from "ai";
import { ChatCommandError, type UserWithModelConfig } from "../../chat-command.service";
import { createModelFromConfig, resolveUserModelConfig } from "~~/server/utils/llm";
import type { BotStreamProvider, AssistantStreamResult } from "../types";
import { persistAssistantMessage } from "../persist-assistant-message";

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
    console.log("[LLM Provider] Creating stream for room:", input.roomId);
    console.log("[LLM Provider] Assistant user:", input.assistantUser.username);
    console.log("[LLM Provider] Messages count:", input.modelMessages.length);

    const modelConfig = await resolveUserModelConfig(input.assistantUser);
    if (!modelConfig) {
      console.error("[LLM Provider] No model config found for user:", input.assistantUser.username);
      throw new ChatCommandError("NO_MODEL_CONFIG", "AI 助理未配置模型", input.roomId);
    }

    console.log("[LLM Provider] Model config:", modelConfig);

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
          console.log("[LLM Provider] Stream finished for room:", input.roomId);
          console.log("[LLM Provider] Response parts:", responseMessage.parts?.length ?? 0);
          try {
            await persistAssistantMessage({
              roomId: input.roomId,
              assistantUserId: input.assistantUser.id,
              parts: responseMessage.parts as any,
            });
            console.log("[LLM Provider] Message saved to database");
            resolveCompleted?.();
          } catch (error) {
            console.error("[LLM Provider] Failed to save message:", error);
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
