import { clearOwnerSession } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  await clearOwnerSession(event);

  return {
    ok: true,
  };
});
