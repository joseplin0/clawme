import { defineVitestConfig } from "@nuxt/test-utils/config";

process.env.NUXT_SESSION_PASSWORD ??=
  "test-session-password-with-at-least-32-characters";
process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5432/clawme";

export default defineVitestConfig({
  test: {
    environment: "node",
    environmentOptions: {
      nuxt: {
        domEnvironment: "happy-dom",
        overrides: {
          runtimeConfig: {
            public: {
              testBypassRouteGuard: true,
            },
          },
        },
      },
    },
    globals: true,
    passWithNoTests: false,
  },
});
