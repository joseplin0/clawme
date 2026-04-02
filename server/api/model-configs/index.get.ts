import type { ModelConfigRecord } from "~~/shared/types/clawme";
import { requireOwnerSession } from "~~/server/utils/auth";
import { db } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  await requireOwnerSession(event);

  const modelConfigs = await db.query.modelConfigs.findMany();

  return modelConfigs.map(
    (modelConfig): ModelConfigRecord => ({
      id: modelConfig.id,
      name: modelConfig.name,
      provider: modelConfig.provider,
      baseUrl: modelConfig.baseUrl || "",
      modelId: modelConfig.modelId,
      createdAt: modelConfig.createdAt.toISOString(),
    }),
  );
});
