import { getChatRoomListData } from "~~/server/services";
import { requireOwnerSession } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  await requireOwnerSession(event);

  const data = await getChatRoomListData();

  return data;
});
