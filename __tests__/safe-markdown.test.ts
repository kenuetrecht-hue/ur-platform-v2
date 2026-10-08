import { describe, expect, it } from "vitest";
import { markdownToSpeech, parseSafeMarkdown, safeMarkdownHref } from "../lib/safe-markdown";

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

  it("speaks a header as its words", () => {
    const raw = "### Learn the seed\n\nWelcome to **Learn mode**.\n\n- Find the seed";
    const collapsed = raw.replace(/\s+/g, " ").trim();
    const spoken = markdownToSpeech(collapsed);
    const fromReply = markdownToSpeech(raw);
    expect(spoken).toContain("Learn the seed");
    expect(spoken).toContain("Learn mode");
    expect(spoken).not.toMatch(/#{2,6}/);
    expect(spoken).not.toContain("**");
    expect(spoken).not.toContain(" - ");
    expect(spoken).not.toContain("..");
    expect(spoken).toContain("Find the seed");
    expect(fromReply).toContain("Learn the seed");
    expect(fromReply).toContain("Find the seed");
    expect(fromReply).not.toMatch(/#/);
    expect(fromReply).not.toContain("**");
  });

  it("speaks hash marks that sit on their own lines as the header words", () => {
    const spoken = markdownToSpeech("#\n#\n# Learn the seed");
    expect(spoken).toContain("Learn the seed");
    expect(spoken).not.toMatch(/#/);
    expect(markdownToSpeech("# # # Learn the seed")).not.toMatch(/#/);
    expect(markdownToSpeech("Use C# here.")).toContain("C#");
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
