import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "~~/app/utils/copy";

describe("copyText", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("优先使用 Clipboard API", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal("navigator", {
      clipboard: {
        writeText,
      },
    });

    expect(await copyText("  hello world  ")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello world");
  });

  it("在 Clipboard API 不可用时回退到 execCommand", async () => {
    const execCommand = vi.fn(() => true);

    vi.stubGlobal("navigator", {});
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    expect(await copyText("fallback")).toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
  });
});
