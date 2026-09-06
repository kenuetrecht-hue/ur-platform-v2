import { describe, expect, it } from "vitest";
import {
  assertShopSendNeverAutoStarts,
  buildCourtListenerSearchUrl,
  buildGovinfoSearchUrl,
  buildPrintableHtml,
  buildUnifiedDiff,
  CNC_USER_STARTS_REMINDER,
  compareDocuments,
  countSyllables,
  expandChapterFromBible,
  findUsState,
  formatFountain,
  inspectShopExport,
  isBlockedGithubImportPath,
  markupContract,
  NOT_YOUR_LAWYER_STAMP,
  parsePublicGithubRepoUrl,
  scoreSpokenDrill,
  specialistToolKinds,
  suggestRhymes,
  US_STATES,
} from "../lib/specialist-job-tools";
import { getCreatorAi } from "../server/_core/ai-creator-registry";
import { getCurriculumForCreator } from "../server/_core/ai-learning-mode";
import {
  getTradeTeachingModules,
  isTradeTeachingCreator,
  TRADE_LEARN_CREATOR_IDS,
} from "../server/_core/trade-teaching-curriculum";
import {
  _resetStoryBiblesForTests,
  expandOwnedChapter,
  reviewContractMarkup,
  reviewDocumentCompare,
  upsertStoryBible,
} from "../server/_core/specialist-job-tools-service";

function b64(text: string): string {
  return Buffer.from(text, "utf8").toString("base64");
}

describe("specialist job tools — security and scoring", () => {
  it("maps the twelve tool surfaces to the right AIs", () => {
    expect(specialistToolKinds("ai-coder-001")).toEqual(expect.arrayContaining(["sandbox", "github"]));
    expect(specialistToolKinds("ai-game-dev-001")).toEqual(expect.arrayContaining(["sandbox", "github"]));
    expect(specialistToolKinds("ai-blockchain-001")).toEqual(expect.arrayContaining(["sandbox", "github"]));
    expect(specialistToolKinds("ai-legal-001")).toContain("legalResearch");
    expect(specialistToolKinds("ai-legal-001")).not.toContain("contract");
    expect(specialistToolKinds("ai-attorney-001")).toEqual(
      expect.arrayContaining(["legalResearch", "contract", "print"]),
    );
    expect(specialistToolKinds("ai-author-001")).toEqual(
      expect.arrayContaining(["storyBible", "fountain", "print"]),
    );
    expect(specialistToolKinds("ai-poet-001")).toContain("rhyme");
    expect(specialistToolKinds("ai-cnc-master-001")).toEqual(
      expect.arrayContaining(["exportCheck", "cncSend", "print"]),
    );
    expect(specialistToolKinds("linguamate")).toEqual(["spokenDrill"]);
  });

  it("builds a readable unified diff", () => {
    const diff = buildUnifiedDiff("App.tsx", "hello", "hello\nworld");
    expect(diff.linesAdded).toBe(1);
    expect(diff.unified).toContain("+world");
  });

  it("only accepts public https GitHub repo URLs", () => {
    expect(parsePublicGithubRepoUrl("https://github.com/acme/widgets")).toEqual({
      owner: "acme",
      repo: "widgets",
    });
    expect(() => parsePublicGithubRepoUrl("https://github.com/acme/widgets.git")).not.toThrow();
    expect(() => parsePublicGithubRepoUrl("git@github.com:acme/widgets.git")).toThrow(/https/);
    expect(() => parsePublicGithubRepoUrl("https://user:ghp_secret@github.com/acme/widgets")).toThrow(/password|token/i);
    expect(() => parsePublicGithubRepoUrl("https://github.com/acme/widgets?token=ghp_secret")).toThrow(/token/i);
    expect(() => parsePublicGithubRepoUrl("https://gitlab.com/acme/widgets")).toThrow(/github.com/);
  });

  it("blocks secret and VCS paths on import", () => {
    expect(isBlockedGithubImportPath(".env")).toBe(true);
    expect(isBlockedGithubImportPath("src/../.env")).toBe(true);
    expect(isBlockedGithubImportPath("node_modules/left-pad/index.js")).toBe(true);
    expect(isBlockedGithubImportPath("src/App.tsx")).toBe(false);
  });

  it("lists 50 states plus DC and builds public citation URLs", () => {
    expect(US_STATES).toHaveLength(51);
    expect(findUsState("IN")?.name).toBe("Indiana");
    expect(findUsState("indiana")?.code).toBe("IN");
    const cl = buildCourtListenerSearchUrl({ query: "landlord tenant", stateCode: "IN" });
    expect(cl.startsWith("https://www.courtlistener.com/api/rest/v4/search/")).toBe(true);
    expect(cl).toContain("Indiana");
    const gov = buildGovinfoSearchUrl({ query: "IRS notice", stateCode: "IN" });
    expect(gov.startsWith("https://www.govinfo.gov/app/search/")).toBe(true);
  });

  it("marks contract risk phrases and compares two drafts", () => {
    const marked = markupContract("Buyer shall indemnify Seller and this is as-is with arbitration.");
    expect(marked.stamp).toBe(NOT_YOUR_LAWYER_STAMP);
    expect(marked.flags.map((f) => f.phrase.toLowerCase()).join(" ")).toMatch(/indemnify|as-is|arbitration/);
    const cmp = compareDocuments("one\ntwo", "one\nthree");
    expect(cmp.changed).toBe(1);
    expect(cmp.stamp).toBe(NOT_YOUR_LAWYER_STAMP);
  });

  it("expands a chapter from the story bible", () => {
    const expanded = expandChapterFromBible(
      {
        title: "River Town",
        logline: "A millwright comes home.",
        characters: [{ name: "Mara", role: "lead", notes: "quiet" }],
        locations: [{ name: "the mill", notes: "night" }],
        chapters: [{ id: "ch-1", title: "Return", summary: "Mara sees the closed gate." }],
      },
      "ch-1",
    );
    expect(expanded.title).toBe("Return");
    expect(expanded.beats.join(" ")).toMatch(/Mara|mill|Return/);
  });

  it("lays out Fountain scene and dialogue", () => {
    const laid = formatFountain("INT. MILL — NIGHT\nMARA\n(whisper)\nLeave the lights off.\nCUT TO:");
    expect(laid.blocks.some((b) => b.kind === "scene")).toBe(true);
    expect(laid.blocks.some((b) => b.kind === "character" && b.text === "MARA")).toBe(true);
    expect(laid.blocks.some((b) => b.kind === "dialogue")).toBe(true);
    expect(laid.plain).toContain("MARA");
  });

  it("counts syllables and suggests rhymes", () => {
    expect(countSyllables("night")).toBe(1);
    expect(suggestRhymes("night").rhymes).toEqual(expect.arrayContaining(["light", "bright"]));
  });

  it("stamps printable HTML and escapes markup", () => {
    const html = buildPrintableHtml({
      title: "Lease <draft>",
      body: "<script>alert(1)</script>",
      stamp: NOT_YOUR_LAWYER_STAMP,
    });
    expect(html).toContain(NOT_YOUR_LAWYER_STAMP);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("validates STL, 3MF, and G-code exports", () => {
    const stl = inspectShopExport("part.stl", b64("solid cube\nfacet\nendsolid cube\n"));
    expect(stl.kind).toBe("stl");
    expect(stl.ok).toBe(true);
    const zip = inspectShopExport("part.3mf", Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]).toString("base64"));
    expect(zip.kind).toBe("3mf");
    expect(zip.ok).toBe(true);
    const g = inspectShopExport("job.gcode", b64("G21\nG90\nG0 X0\nM30\n"));
    expect(g.ok).toBe(true);
    const bad = inspectShopExport("job.gcode", b64("eval(process)\n"));
    expect(bad.ok).toBe(false);
  });

  it("never allows CNC auto-start on the shop-send path", () => {
    expect(() => assertShopSendNeverAutoStarts(true)).toThrow(/press Start/i);
    expect(() => assertShopSendNeverAutoStarts(false)).not.toThrow();
    expect(CNC_USER_STARTS_REMINDER).toMatch(/You press Start/i);
  });

  it("scores a spoken drill without claiming a medical diagnosis", () => {
    const perfect = scoreSpokenDrill("Buenos días", "Buenos días");
    expect(perfect.score).toBe(100);
    const close = scoreSpokenDrill("hello world", "hello word");
    expect(close.score).toBeGreaterThan(40);
    expect(close.score).toBeLessThan(100);
    expect(close.missed).toContain("world");
    expect(close.note).toMatch(/not a medical/i);
  });
});

describe("dedicated trade Learn curricula", () => {
  it.each([...TRADE_LEARN_CREATOR_IDS])("%s has a dedicated trade academy", (creatorId) => {
    expect(isTradeTeachingCreator(creatorId)).toBe(true);
    const modules = getTradeTeachingModules(creatorId);
    expect(modules.length).toBeGreaterThanOrEqual(8);
    expect(modules.some((m) => m.certificationPrep)).toBe(true);
    expect(modules.some((m) => /brand|OEM|nameplate/i.test(m.title + m.description))).toBe(true);
    const def = getCreatorAi(creatorId);
    expect(def).toBeDefined();
    expect(getCurriculumForCreator(def!).length).toBeGreaterThanOrEqual(8);
  });
});

describe("specialist job tools service ownership", () => {
  it("keeps story bibles on the signed-in user and expands their chapter", () => {
    _resetStoryBiblesForTests();
    const saved = upsertStoryBible({
      userId: "user-a",
      creatorId: "ai-author-001",
      draft: {
        title: "River Town",
        logline: "Homecoming",
        characters: [{ name: "Mara", role: "lead", notes: "" }],
        locations: [],
        chapters: [{ id: "ch-1", title: "Return", summary: "The gate is closed." }],
      },
    });
    expect(saved.userId).toBe("user-a");
    const beats = expandOwnedChapter("user-a", saved.id, "ch-1");
    expect(beats.title).toBe("Return");
    expect(() => expandOwnedChapter("user-b", saved.id, "ch-1")).toThrow(/not found/i);
  });

  it("sanitizes contract review output", () => {
    const marked = reviewContractMarkup("  indemnify the seller \u0000 ");
    expect(marked.flags.length).toBeGreaterThan(0);
    const compared = reviewDocumentCompare("alpha", "beta");
    expect(compared.changed + compared.added + compared.removed).toBeGreaterThan(0);
  });
});
