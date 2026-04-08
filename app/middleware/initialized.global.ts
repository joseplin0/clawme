import type { SystemStatusResponse } from "~~/shared/types/clawme";

export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig();

  // 测试环境通过 runtimeConfig 显式关闭全局守卫，避免组件测试和 host 模式 e2e 误触发初始化链路。
  if (config.public.testBypassRouteGuard || import.meta.test) {
    return;
  }

  // Use nuxt-auth-utils session
  const { loggedIn } = useUserSession();

  // Fetch minimal system status for initialization check
  const status = useState<SystemStatusResponse | null>(
    "system-status",
    () => null,
  );

  let statusValue = status.value;

  if (!statusValue) {
    try {
      statusValue = await $fetch<SystemStatusResponse>("/api/system/status", {
        timeout: 5000,
      });
      status.value = statusValue;
    } catch (error) {
      throw createError({
        statusCode: 503,
        statusMessage: "启动检查失败",
        data: {
          detail: toStartupFailureMessage(error),
        },
      });
    }
  }

  if (!statusValue) return;

  if (statusValue.startup.hasBlockingIssue) {
    throw createError({
      statusCode: 503,
      statusMessage: "应用启动检查未通过",
      data: {
        detail: formatBlockingChecks(statusValue),
      },
    });
  }

  const isInitialized = statusValue.isInitialized;
  const isOwnerAuthenticated = loggedIn.value;

  if (!isInitialized && to.path !== "/setup") {
    return navigateTo("/setup");
  }

  if (isInitialized && !isOwnerAuthenticated && to.path !== "/login") {
    return navigateTo("/login");
  }

  if (isInitialized && isOwnerAuthenticated && (to.path === "/setup" || to.path === "/login")) {
    return navigateTo("/");
  }
});

function formatBlockingChecks(status: SystemStatusResponse) {
  const blockingChecks = status.startup.checks.filter((check) => check.status === "error");

  if (blockingChecks.length === 0) {
    return "启动检查返回了阻塞状态，但没有携带具体错误。请查看服务端启动日志。";
  }

  return blockingChecks
    .map((check) => `${check.label}: ${check.detail}`)
    .join("\n");
}

function toStartupFailureMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : "读取 /api/system/status 失败。";
  const payload = (error as { data?: { detail?: string } })?.data;

  if (payload?.detail) {
    return payload.detail;
  }

  return `${message}\n可能是服务端启动未完成、数据库连接卡住，或初始化检查本身超时。`;
}
