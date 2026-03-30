import { and, eq } from "drizzle-orm";
import { db, schema } from "~~/server/utils/db";
import {
  readPersistedSystemConfig,
  setSystemInitialized,
} from "~~/server/utils/system-config";

declare function defineNitroPlugin(
  setup: () => void | Promise<void>,
): () => void | Promise<void>;

const { users } = schema;

export default defineNitroPlugin(async () => {
  const existingConfig = await readPersistedSystemConfig();
  if (existingConfig) {
    return;
  }

  const owner = await db.query.users.findFirst({
    where: and(eq(users.role, "OWNER"), eq(users.type, "human")),
  });

  if (owner) {
    await setSystemInitialized(true);
  }
});
