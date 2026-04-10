import { spawn } from "node:child_process";
import readline from "node:readline";
import type { ModelMessage, UIMessageChunk } from "ai";
import type { UserWithModelConfig } from "../../chat-command.service";
import type { BotStreamProvider, AssistantStreamResult } from "../types";
import { persistAssistantMessage } from "../persist-assistant-message";
import type { MessagePart } from "~~/shared/types/clawme";

export class AcpxBotProvider implements BotStreamProvider {
  // 只处理 coding 工具类型的 bot
  supports(botType: string) {
    return botType === "acpx";
  }

  async createStream(input: {
    roomId: string;
    assistantUser: UserWithModelConfig;
    modelMessages: ModelMessage[];
  }): Promise<AssistantStreamResult> {
    let resolveCompleted: (() => void) | null = null;
    let rejectCompleted: ((error: unknown) => void) | null = null;
    const completed = new Promise<void>((resolve, reject) => {
      resolveCompleted = resolve;
      rejectCompleted = reject;
    });

    // 获取最新的一条用户消息作为指令
    const latestMessage = input.modelMessages[input.modelMessages.length - 1]?.content || "" ;

    // TODO: 这里需要根据你的业务逻辑，从 assistantUser 的配置表或扩展字段中获取
    // 假设这些字段存在于 assistantUser.metadata 或者其他关联表中
    const toolName = "codex"; // 例如配置了使用 codex
    const projectCwd = "/tmp/your-project-path"; // 绑定的项目路径

    const generateStream = async function* (): AsyncGenerator<UIMessageChunk, void, unknown> {
      const finalParts: MessagePart[] = [];
      let currentTextBuffer = "";

      try {
        const child = spawn("acpx", ["run", toolName, "-p", latestMessage as string  , "--format", "json"], {
          cwd: projectCwd,
          shell: true,
        });

        const rl = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });

        for await (const line of rl) {
          if (!line.trim()) continue;

          try {
            const event = JSON.parse(line);

            // 1. 处理大模型吐出的普通文本
            if (event.type === "content_block_delta" && event.delta?.text) {
              currentTextBuffer += event.delta.text;
              yield {
                id: event.id,
                type: "text-delta",
                delta: event.delta.text,
              } satisfies UIMessageChunk;
            } 
            // 2. 处理工具调用开始
            else if (event.type === "tool_use") {
              // 存入稍后入库的结构化数组
              finalParts.push({
                type: "tool-call",
                toolCallId: event.id || `call_${Date.now()}`,
                toolName: event.name,
                args: event.input ?? {},
              });
              
              // 发送给前端渲染工具卡片
              yield {
                type: "tool-input-available",
                toolCallId: event.id || `call_${Date.now()}`,
                toolName: event.name,
                input: JSON.stringify(event.input),
              } satisfies UIMessageChunk;
            }
            // ... 可以在这里继续完善 agent_thought 等事件的映射
            
          } catch {
            console.error("[ACPX] JSON解析失败, 跳过:", line);
          }
        }

        // 进程结束，把最后收集到的文本也合并进 parts
        if (currentTextBuffer.trim()) {
          finalParts.push({ type: "text", text: currentTextBuffer });
        }

        // 抛出 Vercel AI 的结束标识
        yield {
          type: "finish",
          finishReason: "stop",
          messageMetadata: { promptTokens: 0, completionTokens: 0 },
        } satisfies UIMessageChunk;

        await persistAssistantMessage({
          roomId: input.roomId,
          assistantUserId: input.assistantUser.id,
          parts: finalParts,
          status: "done",
        });

        resolveCompleted?.();
      } catch (error) {
        yield { type: "error", errorText: String(error) } satisfies UIMessageChunk;
        
        await persistAssistantMessage({
          roomId: input.roomId,
          assistantUserId: input.assistantUser.id,
          parts: [{ type: "text", text: "工具执行异常: " + String(error) }],
          status: "error",
        });
        
        rejectCompleted?.(error);
      }
    };

    return {
      stream: generateStream(),
      completed,
    };
  }
}
