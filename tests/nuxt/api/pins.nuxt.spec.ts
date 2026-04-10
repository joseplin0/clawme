import { describe, expect, it } from "vitest";
import {
  buildPinsApiResponse,
  createPinRecordFixture,
} from "../helpers/pins";

describe("pins api", () => {
  it("pins 分页响应契约保持稳定", () => {
    const pin = createPinRecordFixture({
      id: "pin-99",
      title: "Contract pin",
      previewMode: "fetched",
      previewUrl: "https://cdn.example.com/preview.jpg",
    });

    expect(buildPinsApiResponse([pin], 2, 15, 31)).toEqual({
      list: [pin],
      pageNum: 2,
      pageSize: 15,
      total: 31,
    });
  });

  it.todo("GET /api/pins 按 page/limit 返回分页结构，并输出前端可直接渲染的 PinRecord 列表");

  it.todo("GET /api/users/[id]/pins 复用同一分页结构并保持 owner 维度的过滤与鉴权");
});
