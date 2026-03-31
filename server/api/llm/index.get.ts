import { requireOwnerSession } from "~~/server/utils/auth";
import { db, schema } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  await requireOwnerSession(event);

  const providers = await db.query.llm.findMany();

  return providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    provider: provider.provider,
    baseUrl: provider.baseUrl || "",
    modelId: provider.modelId,
    createdAt: provider.createdAt.toISOString(),
  }));
});
