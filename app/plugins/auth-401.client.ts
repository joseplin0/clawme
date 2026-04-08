function getRequestPath(request: RequestInfo | URL): string | null {
  if (typeof request === "string") {
    if (request.startsWith("/")) {
      return request;
    }

    try {
      return new URL(request, window.location.origin).pathname;
    } catch {
      return null;
    }
  }

  if (request instanceof Request) {
    return new URL(request.url, window.location.origin).pathname;
  }

  if (request instanceof URL) {
    return request.pathname;
  }

  return null;
}

export default defineNuxtPlugin((nuxtApp) => {
  const session = useUserSession();
  const route = useRoute();
  let redirecting = false;

  const authAwareFetch = $fetch.create({
    async onResponseError({ request, response }) {
      if (response.status !== 401) {
        return;
      }

      const path = getRequestPath(request);
      if (!path?.startsWith("/api/") || redirecting) {
        return;
      }

      redirecting = true;

      try {
        await session.clear();
      } catch {
        session.session.value = null;
      }

      if (route.path !== "/login") {
        await nuxtApp.runWithContext(() =>
          navigateTo("/login", { replace: true }),
        );
      }
    },
  });

  (globalThis as typeof globalThis & { $fetch: typeof $fetch }).$fetch =
    authAwareFetch;
});
