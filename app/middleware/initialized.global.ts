import type { PublicStateResponse } from "~~/shared/types/clawme";

export default defineNuxtRouteMiddleware(async (to) => {
  const bootstrap = useState<PublicStateResponse | null>(
    "bootstrap-state",
    () => null,
  );

  let bootstrapValue = bootstrap.value;

  if (!bootstrapValue) {
    bootstrapValue = await $fetch<PublicStateResponse>("/api/system/bootstrap");
    bootstrap.value = bootstrapValue;
  }

  if (!bootstrapValue) return;

  const isInitialized = bootstrapValue.state.system.isInitialized;
  const isOwnerAuthenticated = bootstrapValue.viewer.isOwnerAuthenticated;

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
