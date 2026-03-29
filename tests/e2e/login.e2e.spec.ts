import { $fetch, fetch, setup } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";

const host = process.env.NUXT_TEST_HOST;

if (!host) {
  throw new Error("NUXT_TEST_HOST 未设置，请通过 `pnpm test:e2e` 运行端到端测试。");
}

describe("login page e2e", async () => {
  await setup({
    host,
    setupTimeout: 120000,
  });

  it("可以渲染登录页关键文案", async () => {
    const response = await fetch("/login");
    const html = await $fetch("/login");

    expect(response.status).toBe(200);
    expect(html).toContain("请输入用户名和密码。");
    expect(html).toContain("用户名");
    expect(html).toContain("密码");
  });
});
