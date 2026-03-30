import { isOwnerAuthenticated } from "~~/server/utils/auth";
import { readBootstrapStateResponse } from "~~/server/services";

export default defineEventHandler(async (event) => {
  const ownerAuthenticated = await isOwnerAuthenticated(event);
  return await readBootstrapStateResponse(ownerAuthenticated);
});
