import { db, schema } from "~~/server/utils/db";
import { eq } from "drizzle-orm";

const { systemConfig } = schema;

export default defineEventHandler(async () => {
  const config = await db.query.systemConfig.findFirst({
    where: eq(systemConfig.id, "global"),
  });

  return {
    isInitialized: config?.isInitialized ?? false,
  };
});
