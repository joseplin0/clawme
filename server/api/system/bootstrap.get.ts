import { isOwnerAuthenticated } from "~~/server/utils/auth";
import { readStoredState, toPublicStateResponse } from "~~/server/utils/app-state";

export default defineEventHandler(async (event) => {
  const state = await readStoredState();
  const ownerAuthenticated = await isOwnerAuthenticated(event);

  // Default to sending only the first 15 feed posts 
  return toPublicStateResponse(state, ownerAuthenticated, 15);
});
