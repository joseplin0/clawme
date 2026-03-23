import { getChatSessionData } from "~~/server/utils/app-state";
import { requireOwnerSession } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  await requireOwnerSession(event);

  const data = await getChatSessionData();

  return {
    state: {
      owner: data.owner,
      bot: data.bot,
      sessions: data.sessions,
      messages: data.messages,
    },
    activeSessionId: data.activeSessionId,
  };
});
