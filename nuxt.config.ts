// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  css: ["~/assets/css/main.css"],
  modules: ["@nuxt/ui", "@nuxt/image", "@nuxtjs/mdc", "nuxt-auth-utils",],
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  vite: {
    optimizeDeps: {
      include: ["@ai-sdk/vue", "ai"],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              !id.includes("mdc") &&
              /[\\/]node_modules[\\/](?:micromark|remark-|mdast-util-|decode-named-character-reference|parse-entities|ccount|markdown-table)/.test(
                id,
              )
            ) {
              return "vendor-remark";
            }
          },
        },
      },
    },
  },
  fonts: {
    provider: "local",
  },
  icon: {
    customCollections: [
      {
        prefix: "cm",
        dir: "./app/assets/icons",
      },
    ],
  },
  mdc: {
    headings: {
      anchorLinks: false, // Disable anchor links in AI responses
    },
    highlight: false,
    components: {
      prose: false,
    },
  },
  nitro: {
    experimental: {
      websocket: true,
    },
  },
  runtimeConfig: {
    public: {
      testBypassRouteGuard: false,
    },
  },
  routeRules: {
    "/": { redirect: "/chat" },
  },
});
