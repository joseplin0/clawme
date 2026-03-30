import { createError, getRequestURL, defineEventHandler } from "h3";
import { isOwnerAuthenticated } from "../utils/auth";
import console from "node:console";

export default defineEventHandler(async (event) => {
  console.log(`[Auth Middleware] Checking authentication for ${event}`);
  const url = getRequestURL(event);

  // 仅拦截 /api/ 开头的接口
  if (url.pathname.startsWith("/api/")) {
    // 跳过某些不需要鉴权的接口，比如登录、公开的状态接口等
    const publicPaths = [
      "/api/_auth/session",
      "/api/auth/login",
      "/api/system/status",
      "/api/system/bootstrap",
    ];

    if (
      publicPaths.some((path) => url.pathname === path) ||
      url.pathname.startsWith("/api/_nuxt_icon/")
    ) {
      return;
    }

    // 使用 unified check (session + JWT + apiSecret)
    // isOwnerAuthenticated 内部会将 user 注入到 event.context.user
    const authenticated = await isOwnerAuthenticated(event);

    if (!authenticated) {
      throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }
  }
});
