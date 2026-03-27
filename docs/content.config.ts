import { fileURLToPath } from "node:url";
import { defineCollection, defineContentConfig } from "@nuxt/content";

const docsRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineContentConfig({
  collections: {
    docs: defineCollection({
      type: "page",
      source: {
        cwd: docsRoot,
        include: "**/*.md",
        prefix: "/",
      },
    }),
  },
});
