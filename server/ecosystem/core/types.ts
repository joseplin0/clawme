import type { ModelMessage, UIMessageChunk } from "ai";
import type { UserWithModelConfig } from "~~/server/services/chat-command.service";

export interface AssistantStreamResult {
  // 支持 Vercel AI 的 ReadableStream 或我们手动实现的 AsyncGenerator
  stream: AsyncGenerator<UIMessageChunk, void, unknown> | ReadableStream<UIMessageChunk>;
  completed: Promise<void>;
}

export interface BotStreamProvider {
  // 决定当前 Provider 是否接管该 Bot 的请求
  supports(botType: string): boolean;
  
  // 核心处理逻辑
  createStream(input: {
    roomId: string;
    assistantUser: UserWithModelConfig;
    modelMessages: ModelMessage[];
  }): Promise<AssistantStreamResult>;
}