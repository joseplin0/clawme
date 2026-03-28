import { fileURLToPath } from "node:url";
import { defineCollection, defineContentConfig } from "@nuxt/content";

const contentRoot = fileURLToPath(new URL("./content/", import.meta.url));

export default defineContentConfig({
  collections: {
    docs: defineCollection({
      type: "page",
      source: {
        cwd: contentRoot,
        include: "**/*.md",
        prefix: "/",
      },
    }),
  },
});
