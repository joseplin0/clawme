import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../database";

const connectionString = process.env.DATABASE_URL!;
const connectTimeoutSeconds = Number.parseInt(
  process.env.DATABASE_CONNECT_TIMEOUT_SECONDS ?? "5",
  10,
);

// Type for the database with schema
type Db = ReturnType<typeof drizzle<typeof schema>>;

// Development singleton pattern
const globalForDb = globalThis as unknown as {
  client: postgres.Sql | undefined;
  db: Db | undefined;
};

export const client =
  globalForDb.client ??
  postgres(connectionString, {
    connect_timeout:
      Number.isFinite(connectTimeoutSeconds) && connectTimeoutSeconds > 0
        ? connectTimeoutSeconds
        : 5,
  });

export const db: Db =
  globalForDb.db ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
  globalForDb.db = db;
}

export { schema };
