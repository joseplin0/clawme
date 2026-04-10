import type { AssistantIntentHandler } from "../intent-types";
import { pinCollectIntentHandler } from "./pin-collect";

export const assistantIntentHandlers: AssistantIntentHandler[] = [
  pinCollectIntentHandler,
];
