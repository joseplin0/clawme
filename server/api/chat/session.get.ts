import { getChatSessionListData } from "~~/server/services";
import { requireOwnerSession } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  await requireOwnerSession(event);

  const data = await getChatSessionListData();

  return data;
});
