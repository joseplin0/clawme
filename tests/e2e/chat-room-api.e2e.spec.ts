import postgres from "postgres";
import { $fetch, setup } from "@nuxt/test-utils/e2e";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const host = process.env.NUXT_TEST_HOST;
const databaseUrl = process.env.DATABASE_URL;

if (!host) {
  throw new Error("NUXT_TEST_HOST 未设置，请通过 `pnpm test:e2e` 运行端到端测试。");
}

if (!databaseUrl) {
  throw new Error("DATABASE_URL 未设置，请通过 `pnpm test:e2e` 运行端到端测试。");
}

const sql = postgres(databaseUrl);

type OwnerAuth = {
  ownerId: string;
  ownerSecret: string;
  botId: string;
};

let auth: OwnerAuth | null = null;

describe("chat room api e2e", async () => {
  await setup({
    host,
    setupTimeout: 120000,
  });

  beforeAll(async () => {
    const [owner] = await sql<{ id: string; api_secret: string }[]>`
      select id, api_secret
      from "user"
      where role = 'OWNER' and type = 'human'
      limit 1
    `;

    const [bot] = await sql<{ id: string }[]>`
      select id
      from "user"
      where type = 'bot'
      limit 1
    `;

    if (!owner?.id || !owner.api_secret || !bot?.id) {
      throw new Error("测试数据库缺少 owner 或 bot 数据，无法执行 chat room api e2e。");
    }

    auth = {
      ownerId: owner.id,
      ownerSecret: owner.api_secret,
      botId: bot.id,
    };
  }, 30000);

  afterAll(async () => {
    await sql.end();
  });

  it("可以读取 actors 列表并创建 direct 会话后获取详情", async () => {
    if (!auth) {
      throw new Error("测试前置鉴权信息未初始化。");
    }

    const headers = {
      Authorization: `Bearer ${auth.ownerSecret}`,
    };

    const actors = await $fetch<Array<{ id: string; type: string }>>("/api/actors", {
      headers,
    });

    expect(actors.some((actor) => actor.id === auth.ownerId)).toBe(true);
    expect(actors.some((actor) => actor.id === auth.botId)).toBe(true);

    const room = await $fetch<{
      id: string;
      type: string;
      memberIds: string[];
    }>("/api/chat/room", {
      method: "POST",
      headers,
      body: {
        memberIds: [auth.botId],
      },
    });

    expect(room.type).toBe("direct");
    expect(room.memberIds).toContain(auth.ownerId);
    expect(room.memberIds).toContain(auth.botId);

    const detail = await $fetch<{
      id: string;
      type: string;
      participants: Array<{ id: string }>;
    }>(`/api/chat/room/${room.id}`, {
      headers,
    });

    expect(detail.id).toBe(room.id);
    expect(detail.type).toBe("direct");
    expect(detail.participants.map((participant) => participant.id)).toEqual(
      expect.arrayContaining([auth.ownerId, auth.botId]),
    );
  }, 60000);
});
