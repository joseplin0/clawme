import { $fetch, fetch, setup } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";

// 必须放在最外层，且提前注册 runner 环境
await setup({
  setupTimeout: 120000,
  runner: "vitest",
});

// describe 必须是同步的
describe("login page e2e", () => {
  it("可以渲染登录页关键文案", async () => {
    const response = await fetch("/login");
    await $fetch<string>("/login");

    expect(response.status).toBe(200);
  });
});