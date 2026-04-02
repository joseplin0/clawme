import postgres from "postgres";
import { $fetch, fetch, setup } from "@nuxt/test-utils/e2e";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type OwnerAuth = {
  ownerId: string;
  ownerSecret: string;
  botId: string;
};

let auth: OwnerAuth | null = null;
let sql: ReturnType<typeof postgres> | null = null;

// 必须放在最外层，且提前注册 runner 环境
await setup({
  setupTimeout: 120000,
  runner: "vitest",
});

// describe 必须是同步的
describe("chat room api", () => {
  beforeAll(async () => {
    // 初始化数据库连接（此时 .env.test 已加载）
    const databaseUrl =
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/clawme";
    sql = postgres(databaseUrl);

    // 1. 初始化系统和测试数据
    const statusResponse = await fetch("/api/system/status");
    if (!statusResponse.ok) {
      throw new Error(`Failed to read system status: ${statusResponse.status}`);
    }

    const status = await statusResponse.json();
    if (!status.isInitialized) {
      const bootstrapResponse = await fetch("/api/system/bootstrap", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ownerNickname: "CI Owner",
          ownerUsername: "ci_owner",
          ownerPassword: "ci-owner-password",
          assistantNickname: "Clawme",
          assistantRole: "CI assistant",
          assistantIntro: "Bootstrap fixture for end-to-end tests.",
          modelConfigName: "CI Mock Provider",
          provider: "openai-compatible",
          baseUrl: "https://example.com/v1",
          apiKey: "ci-test-key",
          modelId: "gpt-4o-mini",
        }),
      });

      if (!bootstrapResponse.ok) {
        const errorText = await bootstrapResponse.text();
        throw new Error(
          `Failed to bootstrap test data: ${bootstrapResponse.status} ${errorText}`
        );
      }
    }

    // 2. 查询测试账号信息
    const [owner] = await sql!<{ id: string; api_secret: string }[]>`
      select id, api_secret
      from "user"
      where role = 'OWNER' and type = 'human'
      limit 1
    `;

    const [bot] = await sql!<{ id: string }[]>`
      select id
      from "user"
      where type = 'bot'
      limit 1
    `;

    if (!owner?.id || !owner.api_secret || !bot?.id) {
      throw new Error("测试数据库缺少 owner 或 bot 数据，无法执行 chat room api 测试。");
    }

    auth = {
      ownerId: owner.id,
      ownerSecret: owner.api_secret,
      botId: bot.id,
    };
  }, 30000);

  afterAll(async () => {
    await sql?.end();
  });

  it("可以读取 users 列表并创建 direct 会话后获取详情", async () => {
    if (!auth) {
      throw new Error("测试前置鉴权信息未初始化。");
    }

    // 解构赋值，解决 TypeScript 类型推断 null 的问题
    const { ownerId, ownerSecret, botId } = auth;

    const headers = {
      Authorization: `Bearer ${ownerSecret}`,
    };

    const users = await $fetch<Array<{ id: string; type: string }>>("/api/users", {
      headers,
    });

    expect(users.some((user) => user.id === ownerId)).toBe(true);
    expect(users.some((user) => user.id === botId)).toBe(true);

    const room = await $fetch<{
      id: string;
      type: string;
      memberIds: string[];
    }>("/api/chat/room", {
      method: "POST",
      headers,
      body: {
        memberIds: [botId],
      },
    });

    expect(room.type).toBe("direct");
    expect(room.memberIds).toContain(ownerId);
    expect(room.memberIds).toContain(botId);

    const detail = await $fetch<{
      id: string;
      type: string;
      members: Array<{ id: string }>;
    }>(`/api/chat/room/${room.id}`, {
      headers,
    });

    expect(detail.id).toBe(room.id);
    expect(detail.type).toBe("direct");
    expect(detail.members.map((member) => member.id)).toEqual(
      expect.arrayContaining([ownerId, botId])
    );
  }, 60000);
});
