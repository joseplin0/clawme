import type { provide } from "vue";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  css: ["~/assets/css/main.css"],
  modules: ["@nuxt/ui"],
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  fonts: {
    provider: "local",
  },
});
