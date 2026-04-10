import type { MessagePart } from "~~/shared/types/clawme";
import type { AssistantStreamResult } from "./types";

export interface AssistantIntentHistoryMessage {
  id: string;
  roomId: string;
  senderId: string;
  role: "user" | "assistant" | "system";
  parts: MessagePart[];
  createdAt: Date;
}

export interface AssistantInvocationContext {
  roomId: string;
  assistantUser: {
    id: string;
    username: string;
  };
  triggerMessageId: string;
  triggerMessage: AssistantIntentHistoryMessage;
  recentMessages: AssistantIntentHistoryMessage[];
}

export type AssistantIntentDecision =
  | {
    kind: "pass";
  }
  | {
    kind: "handled" | "needs_confirmation";
    text: string;
  };

export type AssistantIntentRouteResult =
  | {
    kind: "pass";
  }
  | {
    kind: "handled";
    source: string;
    streamResult: AssistantStreamResult;
  };

export interface AssistantIntentHandler {
  name: string;
  match(
    context: AssistantInvocationContext,
  ): Promise<boolean> | boolean;
  handle(
    context: AssistantInvocationContext,
  ): Promise<AssistantIntentDecision> | AssistantIntentDecision;
}
