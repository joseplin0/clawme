import { requireOwnerSession } from "~~/server/utils/auth";
import { getAllActorProfiles } from "~~/server/services/room.service";

export default defineEventHandler(async (event) => {
  await requireOwnerSession(event);
  return await getAllActorProfiles();
});
