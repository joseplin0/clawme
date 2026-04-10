import { mountSuspended, mockComponent } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import PinCard from "~~/app/components/PinCard.vue";
import { createPinRecordFixture } from "../helpers/pins";

mockComponent("UBadge", {
  props: {
    label: {
      type: String,
      default: "",
    },
    color: {
      type: String,
      default: "",
    },
  },
  template:
    '<span data-testid="badge" :data-label="label" :data-color="color"><slot>{{ label }}</slot></span>',
});

describe("PinCard", () => {
  it("渲染预览图、标题、站点名、域名、备注、状态和采集时间", async () => {
    const wrapper = await mountSuspended(PinCard, {
      props: {
        pin: createPinRecordFixture({
          sourceUrl: "https://example.com/article",
          title: "一篇值得收藏的文章",
          description: "文章摘要",
          note: "晚点看",
          siteName: "Example",
          domain: "example.com",
          previewUrl: "/api/files/pin-cover.jpg",
          previewWidth: 1000,
          previewHeight: 1400,
          previewMode: "fetched",
          status: "ready",
        }),
      },
    });

    const link = wrapper.get("a");
    expect(link.attributes("href")).toBe("https://example.com/article");
    expect(link.attributes("target")).toBe("_blank");

    const img = wrapper.get("img");
    expect(img.attributes("src")).toBe("/api/files/pin-cover.jpg");
    expect(img.attributes("alt")).toBe("一篇值得收藏的文章");
    expect(img.attributes("style")).toContain("aspect-ratio: 1000 / 1400");

    expect(wrapper.text()).toContain("一篇值得收藏的文章");
    expect(wrapper.text()).toContain("晚点看");
    expect(wrapper.text()).toContain("Example");
    expect(wrapper.text()).toContain("example.com");
    expect(wrapper.text()).toContain("已入库");
    expect(wrapper.text()).toContain("远程图缓存");
    expect(wrapper.text()).toContain("2026/3/29");
  });

  it("在没有可用预览图时回退到生成封面图，并保持卡片瀑布流比例稳定", async () => {
    const wrapper = await mountSuspended(PinCard, {
      props: {
        pin: createPinRecordFixture({
          id: "pin-fallback",
          sourceUrl: "https://example.com/post",
          title: "",
          description: "",
          note: "",
          siteName: "收藏内容",
          domain: "example.com",
          previewUrl: "",
          previewMode: "generated",
          status: "failed",
          createdAt: "2026-03-29T08:00:00.000Z",
        }),
      },
    });

    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.text()).toContain("收藏内容");
    expect(wrapper.text()).toContain("example.com");
    expect(wrapper.text()).toContain("生成封面");
    expect(wrapper.text()).toContain("采集失败");
  });
});
