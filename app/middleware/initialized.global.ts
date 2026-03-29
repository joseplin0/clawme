export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig();

  // 测试环境通过 runtimeConfig 显式关闭全局守卫，避免组件测试和 host 模式 e2e 误触发初始化链路。
  if (config.public.testBypassRouteGuard) {
    return;
  }

  // Use nuxt-auth-utils session
  const { loggedIn } = useUserSession();

  // Fetch minimal system status for initialization check
  const status = useState<{ isInitialized: boolean } | null>(
    "system-status",
    () => null,
  );

  let statusValue = status.value;

  if (!statusValue) {
    statusValue = await $fetch<{ isInitialized: boolean }>("/api/system/status");
    status.value = statusValue;
  }

  if (!statusValue) return;

  const isInitialized = statusValue.isInitialized;
  const isOwnerAuthenticated = loggedIn.value;

  if (!isInitialized && to.path !== "/setup") {
    return navigateTo("/setup");
  }

  if (isInitialized && !isOwnerAuthenticated && to.path !== "/login") {
    return navigateTo("/login");
  }

  if (isInitialized && isOwnerAuthenticated && (to.path === "/setup" || to.path === "/login")) {
    return navigateTo("/moment");
  }
});
