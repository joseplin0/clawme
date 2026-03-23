export default defineNuxtRouteMiddleware(async (to) => {
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
    return navigateTo("/feed");
  }
});
