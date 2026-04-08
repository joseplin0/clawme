import { and, eq } from "drizzle-orm";
import { db, schema } from "~~/server/utils/db";
import {
  beginStartupCheck,
  failStartupCheck,
  passStartupCheck,
  runStartupCheck,
  warnStartupCheck,
} from "~~/server/utils/startup-check";
import {
  readPersistedSystemConfig,
  setSystemInitialized,
} from "~~/server/utils/system-config";

const { users } = schema;

export default defineNitroPlugin(async () => {
  console.info("[startup] system-config-init: begin");

  const databaseUrl = process.env.DATABASE_URL?.trim();

  beginStartupCheck(
    "startup.env.database-url",
    "DATABASE_URL",
    "Checking database connection string.",
  );

  if (!databaseUrl) {
    failStartupCheck(
      "startup.env.database-url",
      "DATABASE_URL",
      "DATABASE_URL is missing. Startup can render, but database-backed setup and login will fail.",
    );
    console.error("[startup] DATABASE_URL is missing.");
    return;
  }

  passStartupCheck(
    "startup.env.database-url",
    "DATABASE_URL",
    "Database connection string is configured.",
  );

  try {
    const existingConfig = await runStartupCheck({
      key: "startup.system-config.read",
      label: "Read persisted system config",
      detail: "Checking whether initialization state was already stored.",
      successDetail: (config) =>
        config
          ? "Found persisted system config."
          : "No persisted system config found yet.",
      run: () => readPersistedSystemConfig(),
      timeoutMs: 1500,
    });

    if (existingConfig) {
      console.info("[startup] system-config-init: persisted config found");
      return;
    }

    const owner = await runStartupCheck({
      key: "startup.database.owner-lookup",
      label: "Probe owner record",
      detail: "Looking for an existing OWNER user to infer initialized state.",
      successDetail: (value) =>
        value
          ? "Owner record found in database."
          : "Owner record not found; app remains uninitialized.",
      run: () =>
        db.query.users.findFirst({
          where: and(eq(users.role, "OWNER"), eq(users.type, "human")),
        }),
      timeoutMs: 5000,
      timeoutDetail:
        "Owner lookup timed out after 5000ms. Database may be unreachable or stalled during startup.",
    });

    if (!owner) {
      warnStartupCheck(
        "startup.system.initialization",
        "Infer initialization state",
        "No owner record detected yet. Setup screen should remain available.",
      );
      console.info("[startup] system-config-init: owner not found");
      return;
    }

    await runStartupCheck({
      key: "startup.system.initialization",
      label: "Persist initialized state",
      detail: "Syncing the runtime initialization flag from the owner record.",
      successDetail: () => "Runtime initialization flag synced from database.",
      run: async () => {
        await setSystemInitialized(true);
      },
      timeoutMs: 1500,
    });

    console.info("[startup] system-config-init: initialization flag synced");
  } catch (error) {
    console.error("[startup] system-config-init failed:", error);
  }
});
