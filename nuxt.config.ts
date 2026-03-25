import type { provide } from "vue";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  css: ["~/assets/css/main.css"],
  modules: ["@nuxt/ui", "@nuxt/image", "@nuxtjs/mdc", "nuxt-auth-utils"],
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
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
  },
});
