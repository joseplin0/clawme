import { getActiveSessionId } from "~~/server/utils/app-state";
import { requireOwnerSession } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const { state } = await requireOwnerSession(event);

  return {
    state: {
      system: state.system,
      owner: state.owner,
      bot: state.bot,
      providers: state.providers,
      sessions: state.sessions,
      messages: state.messages,
    },
    activeSessionId: getActiveSessionId(state),
  };
});
