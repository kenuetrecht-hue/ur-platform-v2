import { describe, expect, it } from "vitest";
import { parseSafeMarkdown, safeMarkdownHref } from "../lib/safe-markdown";

describe("safe markdown", () => {
  it("turns bold and lists into structure instead of asterisks", () => {
    const blocks = parseSafeMarkdown("Welcome to **Learn mode**.\n\n- Find the seed\n- Write the scene");
    const dumped = JSON.stringify(blocks);
    expect(dumped).toContain("Learn mode");
    expect(dumped).not.toContain("**");
    expect(blocks.some((block) => block.kind === "list" && block.items.length === 2)).toBe(true);
    const paragraph = blocks.find((block) => block.kind === "paragraph");
    expect(paragraph && paragraph.kind === "paragraph" && paragraph.children.some((piece) => piece.kind === "strong")).toBe(
      true,
    );
  });

  it("does not keep script tags or javascript links", () => {
    expect(safeMarkdownHref("javascript:alert(1)")).toBeNull();
    expect(safeMarkdownHref("https://urplatform.llc/welcome")).toBe("https://urplatform.llc/welcome");
    const blocks = parseSafeMarkdown('<script>alert(1)</script>\n\n[open](javascript:alert(1))');
    const dumped = JSON.stringify(blocks);
    expect(dumped).not.toContain("javascript:");
    expect(dumped).not.toContain("<script>");
    const link = JSON.stringify(blocks).includes('"href":null');
    expect(link).toBe(true);
  });
});
