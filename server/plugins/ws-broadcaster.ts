import { onPublishWs } from "~~/server/utils/ws-event-bus";

const broadcasterKey = "__clawmeWsBroadcasterCleanup";

export default defineNitroPlugin((nitroApp) => {
  const globalState = globalThis as typeof globalThis & {
    [broadcasterKey]?: (() => void) | undefined;
  };

  if (globalState[broadcasterKey]) {
    return;
  }

  const unsubscribe = onPublishWs(({ userIds, message }) => {
    const rawMessage = JSON.stringify(message);
    const hooks = nitroApp.hooks as {
      callHook: (name: string, ...args: unknown[]) => Promise<unknown>;
    };

    for (const userId of userIds) {
      void hooks.callHook(
        "crossws:publish",
        `user:${userId}`,
        rawMessage,
      );
    }
  });

  globalState[broadcasterKey] = unsubscribe;
  nitroApp.hooks.hookOnce("close", () => {
    unsubscribe();
    globalState[broadcasterKey] = undefined;
  });
});
