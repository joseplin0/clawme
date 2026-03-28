import { fileURLToPath } from "node:url";
import resolveDocLinks from "./markdown/resolve-doc-links";

const contentRoot = fileURLToPath(new URL("./content/", import.meta.url));

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/content", "@nuxt/ui"],
  css: ["~/assets/css/main.css"],
  fonts: {
    provider: "local",
  },
  content: {
    build: {
      markdown: {
        remarkPlugins: {
          "resolve-doc-links": {
            instance: resolveDocLinks,
            options: {
              rootDir: contentRoot,
            },
          },
        },
        toc: {
          depth: 3,
          searchDepth: 3,
        },
      },
    },
  },
});
