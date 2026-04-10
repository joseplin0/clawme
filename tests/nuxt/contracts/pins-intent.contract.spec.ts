import { describe, expect, it } from "vitest";
import {
  buildPinsApiResponse,
  classifyPinIntent,
  createPinRecordFixture,
  mapPinCardFixture,
  normalizePinUrl,
} from "../helpers/pins";

describe("pin intent contract", () => {
  it("主 bot direct 会话里，裸链接和短备注直接进入 handled", () => {
    expect(
      classifyPinIntent({
        assistantUsername: "clawme",
        roomType: "direct",
        text: "https://example.com/article",
      }),
    ).toBe("handled");

    expect(
      classifyPinIntent({
        assistantUsername: "clawme",
        roomType: "direct",
        text: "存一下 https://example.com/article",
      }),
    ).toBe("handled");

    expect(
      classifyPinIntent({
        assistantUsername: "clawme",
        roomType: "direct",
        text: "这个先收一下 https://example.com/article",
      }),
    ).toBe("handled");
  });

  it("长问题或明显歧义时返回 needs_confirmation，非主 bot direct 会话返回 pass", () => {
    expect(
      classifyPinIntent({
        assistantUsername: "clawme",
        roomType: "direct",
        text: "这个文章和我们现在的方案有什么关系？https://example.com/article",
      }),
    ).toBe("needs_confirmation");

    expect(
      classifyPinIntent({
        assistantUsername: "clawme",
        roomType: "group",
        text: "https://example.com/article",
      }),
    ).toBe("pass");

    expect(
      classifyPinIntent({
        assistantUsername: "other-bot",
        roomType: "direct",
        text: "https://example.com/article",
      }),
    ).toBe("pass");
  });

  it("采集链接归一化会清理追踪参数和 fragment", () => {
    expect(
      normalizePinUrl(
        "https://Example.com/post?utm_source=x&utm_campaign=y&keep=1#section",
      ),
    ).toBe("https://example.com/post?keep=1");

    expect(
      normalizePinUrl("https://example.com/post?fbclid=abc&gclid=def"),
    ).toBe("https://example.com/post");
  });

  it("PinCard 和 pins API 的契约字段保持稳定", () => {
    const pin = createPinRecordFixture();

    expect(mapPinCardFixture(pin)).toEqual({
      title: "一篇值得收藏的文章",
      description: "文章摘要",
      note: "晚点看",
      siteName: "Example",
      domain: "example.com",
      previewUrl: "/api/files/pin-cover.jpg",
      previewWidth: 1000,
      previewHeight: 1400,
      previewMode: "generated",
      status: "ready",
      createdAt: "2026-03-29T00:00:00.000Z",
    });

    expect(buildPinsApiResponse([pin], 2, 15, 31)).toEqual({
      list: [pin],
      pageNum: 2,
      pageSize: 15,
      total: 31,
    });
  });
});
