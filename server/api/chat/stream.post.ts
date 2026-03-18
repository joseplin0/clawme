import { createError, createEventStream, readBody } from "h3";
import type { ChatStreamRequest } from "~~/shared/types/clawme";
import {
  createMessage,
  createMockAssistantReply,
  getActiveSessionId,
  updateMessage,
} from "~~/server/utils/app-state";
import { requireOwnerSession } from "~~/server/utils/auth";

function chunkText(input: string) {
  const chunks: string[] = [];

  for (let index = 0; index < input.length; index += 18) {
    chunks.push(input.slice(index, index + 18));
  }

  return chunks;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default defineEventHandler(async (event) => {
  const { state, owner, bot } = await requireOwnerSession(event);
  const body = await readBody<ChatStreamRequest>(event);
  const prompt = body.prompt?.trim();

  if (!prompt) {
    throw createError({
      statusCode: 400,
      statusMessage: "prompt is required.",
    });
  }

  const sessionId = body.sessionId ?? getActiveSessionId(state);

  if (!sessionId || !bot) {
    throw createError({
      statusCode: 400,
      statusMessage: "No active chat session is available.",
    });
  }

  await createMessage({
    sessionId,
    senderId: owner.id,
    content: prompt,
    status: "DONE",
  });

  const placeholder = await createMessage({
    sessionId,
    senderId: bot.id,
    content: "",
    status: "GENERATING",
  });

  const eventStream = createEventStream(event);
  const reply = createMockAssistantReply(prompt, state);
  const thinking =
    "Phase 1 stream scaffold is active: placeholder created, chunks streaming, final message pending.";

  void (async () => {
    let accumulated = "";

    try {
      await eventStream.push({
        event: "placeholder",
        data: JSON.stringify({
          sessionId,
          message: placeholder,
        }),
      });

      for (const chunk of chunkText(reply)) {
        accumulated += chunk;
        await wait(45);
        await eventStream.push({
          event: "delta",
          data: JSON.stringify({
            messageId: placeholder.id,
            chunk,
          }),
        });
      }

      const completedMessage = await updateMessage(placeholder.id, {
        content: accumulated,
        status: "DONE",
        thinkingContent: thinking,
      });

      await eventStream.push({
        event: "done",
        data: JSON.stringify({
          sessionId,
          message: completedMessage,
        }),
      });
    } catch (error) {
      await updateMessage(placeholder.id, {
        content: accumulated,
        status: "ERROR",
        thinkingContent: `Stream failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });

      await eventStream.push({
        event: "error",
        data: JSON.stringify({
          messageId: placeholder.id,
        }),
      });
    } finally {
      await eventStream.close();
    }
  })();

  return eventStream.send();
});
