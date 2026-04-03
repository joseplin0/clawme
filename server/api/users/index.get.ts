import { requireOwnerSession } from "~~/server/utils/auth";
import { getAllUserProfiles } from "~~/server/chat/room.service";

export default defineEventHandler(async (event) => {
  await requireOwnerSession(event);
  return await getAllUserProfiles();
});
