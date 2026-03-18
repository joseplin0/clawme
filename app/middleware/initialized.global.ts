import type { PublicStateResponse } from "~/shared/types/clawme";

export default defineNuxtRouteMiddleware(async (to) => {
  const bootstrap = useState<PublicStateResponse | null>(
    "bootstrap-state",
    () => null,
  );

  if (!bootstrap.value) {
    bootstrap.value = await $fetch("/api/system/bootstrap");
  }

  const isInitialized = bootstrap.value.state.system.isInitialized;

  if (!isInitialized && to.path !== "/setup") {
    return navigateTo("/setup");
  }

  if (isInitialized && to.path === "/setup") {
    return navigateTo("/feed");
  }
});
