import { mountSuspended, mockComponent } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import MomentCard from "~~/app/components/MomentCard.vue";
import { createUser, createMoment } from "../helpers/factories";

mockComponent("UBlogPost", {
  props: {
    title: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    date: {
      type: String,
      default: "",
    },
    badge: {
      type: Object,
      default: undefined,
    },
    authors: {
      type: Array,
      default: () => [],
    },
    image: {
      type: Object,
      default: undefined,
    },
  },
  template: `
    <article
      data-testid="blog-post"
      :data-title="title"
      :data-description="description"
      :data-badge-label="badge?.label"
      :data-badge-color="badge?.color"
      :data-authors="authors.map((author) => author.name).join('|')"
      :data-author-descriptions="authors.map((author) => author.description).join('|')"
      :data-image-src="image?.src || ''"
      :data-image-alt="image?.alt || ''"
    />
  `,
});

describe("MomentCard", () => {
  it("把作者、徽标和首图映射给卡片组件", async () => {
    const primaryAuthor = createUser({
      id: "bot-1",
      type: "bot",
      username: "clawme",
      nickname: "虾米",
      role: "主理助理",
    });
    const coAuthor = createUser({
      id: "human-1",
      username: "lin",
      nickname: "林",
    });

    const wrapper = await mountSuspended(MomentCard, {
      props: {
        moment: createMoment({
          primaryAuthorId: primaryAuthor.id,
          coAuthorIds: [coAuthor.id],
          title: "夜间灵感",
          text: "补一条新的灵感记录。",
          context: "创作",
          attachments: [
            {
              id: "asset-1",
              kind: "IMAGE",
              url: "https://example.com/cover.png",
              width: 960,
              height: 720,
              title: "封面图",
              subtitle: "",
              icon: "i-lucide-image",
              accent: "blue",
            },
          ],
        }),
        usersById: {
          [primaryAuthor.id]: primaryAuthor,
          [coAuthor.id]: coAuthor,
        },
      },
    });

    const _card = wrapper.find("article");

    // image
    const img = wrapper.find("img");
    expect(img.attributes("src")).toBe("https://example.com/cover.png");
    expect(img.attributes("alt")).toBe("夜间灵感");
  });

  it("在缺少标题和首图时使用作者昵称回退", async () => {
    const author = createUser({
      id: "human-1",
      username: "lin",
      nickname: "林",
    });

    const wrapper = await mountSuspended(MomentCard, {
      props: {
        moment: createMoment({
          primaryAuthorId: author.id,
          title: null,
          text: "",
          attachments: [],
        }),
        usersById: {
          [author.id]: author,
        },
      },
    });

    const titleElement = wrapper.find("p.line-clamp-2");
    expect(titleElement.exists()).toBe(true);
    const img = wrapper.find("img");
    expect(img.exists()).toBe(false);
  });
});
