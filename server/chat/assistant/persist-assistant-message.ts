import { createUIMessageStream } from "ai";
import type { ClawmeUIMessage, MessagePart } from "~~/shared/types/clawme";
import { createMessage } from "../chat.service";
import type { AssistantStreamResult } from "./types";

export async function persistAssistantMessage(input: {
  roomId: string;
  assistantUserId: string;
  parts: MessagePart[];
  status?: "done" | "error";
}) {
  return await createMessage({
    roomId: input.roomId,
    senderId: input.assistantUserId,
    role: "assistant",
    parts: input.parts,
    status: input.status ?? "done",
  });
}

export function createStaticAssistantMessageStream(input: {
  roomId: string;
  assistantUserId: string;
  text: string;
}): AssistantStreamResult {
  let resolveCompleted: (() => void) | null = null;
  let rejectCompleted: ((error: unknown) => void) | null = null;
  const completed = new Promise<void>((resolve, reject) => {
    resolveCompleted = resolve;
    rejectCompleted = reject;
  });
  const createdAt = Date.now();

  const stream = createUIMessageStream<ClawmeUIMessage>({
    execute: ({ writer }) => {
      const textId = crypto.randomUUID();
      writer.write({
        type: "message-metadata",
        messageMetadata: {
          userId: input.assistantUserId,
          createdAt,
        },
      });
      writer.write({
        type: "text-start",
        id: textId,
      });
      writer.write({
        type: "text-delta",
        id: textId,
        delta: input.text,
      });
      writer.write({
        type: "text-end",
        id: textId,
      });
    },
    onFinish: async ({ responseMessage }) => {
      try {
        await persistAssistantMessage({
          roomId: input.roomId,
          assistantUserId: input.assistantUserId,
          parts: (responseMessage.parts as MessagePart[]) ?? [],
        });
        resolveCompleted?.();
      } catch (error) {
        rejectCompleted?.(error);
        throw error;
      }
    },
  });

  return {
    stream,
    completed,
  };
}
