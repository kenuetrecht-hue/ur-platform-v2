import { describe, it, expect, beforeEach } from "vitest";
import {
  apparelLookFundCutCents,
  UR_WORLD_LOOK_FUND_CHIP_PACKS,
  UR_WORLD_LOOK_FUND_PURPOSE,
  UR_WORLD_LOOK_FUND_STAGES,
} from "../lib/ur-world-look-fund";
import {
  buildTipperShareCaption,
  tipChipPacksHaveBadges,
  tipperStatusFromCents,
} from "../lib/ur-world-tipper-badges";
import { containsForbiddenUrWorldClaim } from "../lib/ur-world-disclosures";
import { UR_WORLD_STORK_SYSTEM_RULE } from "../lib/ur-world-future-plan";
import {
  chipInLookFund,
  getLookFundBoard,
  tryApplyLookFundOwnerCommand,
  tryApplyLookSpendCommand,
} from "../server/_core/ur-world-look-fund-service";
import { _resetUrWorldForTests } from "../server/_core/ur-world-service";
import { purchaseCosmeticPack as buyPack } from "../server/_core/ur-world-locker-service";

describe("UR World plaza look tips", () => {
  beforeEach(() => _resetUrWorldForTests());

  it("never prices a tip at exactly $5", () => {
    expect(UR_WORLD_LOOK_FUND_CHIP_PACKS.every((p) => p.priceCents !== 500)).toBe(true);
  });

  it("earmarks 20% of a clothing pack", () => {
    expect(apparelLookFundCutCents(199)).toBe(40);
    expect(apparelLookFundCutCents(249)).toBe(50);
  });

  it("fills Plan B then overflows to C, and names who crossed B", () => {
    chipInLookFund({
      userId: "early",
      userEmail: "early@test.com",
      displayName: "Early Bird",
      packId: "look_100",
    });
    let board = getLookFundBoard();
    expect(board.raisedCents).toBe(10_000);
    expect(board.fillingStageId).toBe("B");
    expect(board.stages[0]!.funded).toBe(false);

    chipInLookFund({
      userId: "closer",
      userEmail: "closer@test.com",
      displayName: "Pat Closer",
      packId: "look_100",
    });
    chipInLookFund({
      userId: "closer",
      userEmail: "closer@test.com",
      displayName: "Pat Closer",
      packId: "look_100",
    });
    chipInLookFund({
      userId: "closer",
      userEmail: "closer@test.com",
      displayName: "Pat Closer",
      packId: "look_100",
    });
    board = getLookFundBoard();
    expect(board.raisedCents).toBe(40_000);
    expect(board.stages[0]!.funded).toBe(true);
    expect(board.stages[0]!.closer?.displayName).toBe("Pat");
    expect(board.fillingStageId).toBe("C");
    expect(board.stages[1]!.filledCents).toBe(0);

    chipInLookFund({
      userId: "next",
      userEmail: "next@test.com",
      displayName: "Sam Next",
      packId: "look_25",
    });
    board = getLookFundBoard();
    expect(board.stages[1]!.filledCents).toBe(2500);
    expect(board.weeklyTop[0]!.displayName).toBe("Pat");
    expect(board.weeklyTop[0]!.cents).toBe(30_000);
  });

  it("counts clothing-pack earmarks on the same board", () => {
    buyPack({
      userId: "shopper",
      userEmail: "s@test.com",
      packId: "civic-dawn",
      displayName: "Shopper Lee",
    });
    const board = getLookFundBoard();
    expect(board.raisedCents).toBe(40);
    expect(board.weeklyTop[0]!.displayName).toBe("Shopper");
  });

  it("tells Stork tips are not charity and not an auto-buy", () => {
    expect(UR_WORLD_STORK_SYSTEM_RULE.toLowerCase()).toContain("tip");
    expect(UR_WORLD_STORK_SYSTEM_RULE.toLowerCase()).toContain("not tax-deductible");
    expect(UR_WORLD_STORK_SYSTEM_RULE).toContain("20%");
    expect(UR_WORLD_STORK_SYSTEM_RULE).toContain("REPORT LOOK SPEND");
    expect(UR_WORLD_STORK_SYSTEM_RULE.toLowerCase()).toContain("what the money was spent on");
    expect(UR_WORLD_STORK_SYSTEM_RULE.toLowerCase()).toContain("what upgrade went live");
    expect(UR_WORLD_STORK_SYSTEM_RULE.toLowerCase()).toContain("keep accepting tips");
    expect(UR_WORLD_STORK_SYSTEM_RULE.toLowerCase()).toContain("next scene");
    expect(UR_WORLD_STORK_SYSTEM_RULE).toContain("SET NEXT LOOK SCENE");
    expect(UR_WORLD_LOOK_FUND_PURPOSE.toLowerCase()).toContain("keep accepting tips");
    expect(UR_WORLD_STORK_SYSTEM_RULE).toContain("Faithful Tipper");
    expect(UR_WORLD_STORK_SYSTEM_RULE.toLowerCase()).toContain("never donor");
    expect(UR_WORLD_LOOK_FUND_PURPOSE.toLowerCase()).toContain("help grow ur platform");
    expect(UR_WORLD_LOOK_FUND_STAGES.map((s) => s.id)).toEqual(["B", "C", "D"]);
  });

  it("posts a public receipt of what was bought and what upgrade went live", () => {
    const reply = tryApplyLookSpendCommand(
      "REPORT LOOK SPEND B 387 | Sketchfab Café Interior commercial kit | Glow Bar tables, chairs, and bar are now live in the plaza",
    );
    expect(reply).toMatch(/387/);
    expect(reply).toMatch(/Glow Bar/);
    const board = getLookFundBoard();
    expect(board.spendReports[0]!.stageId).toBe("B");
    expect(board.spendReports[0]!.spentCents).toBe(38700);
    expect(board.spendReports[0]!.bought).toMatch(/Sketchfab/i);
    expect(board.spendReports[0]!.upgrade).toMatch(/Glow Bar/i);
  });

  it("names the next scene in public so people know where tips go after this level", () => {
    const reply = tryApplyLookFundOwnerCommand(
      "SET NEXT LOOK SCENE Night garden walk — a new place to sit under the trees",
    );
    expect(reply).toMatch(/Night garden/i);
    const board = getLookFundBoard();
    expect(board.nextSceneLine).toMatch(/Night garden/i);
    expect(board.currentLevelComplete).toBe(false);
  });

  it("unlocks a shareable tipper badge, not a donor certificate", () => {
    expect(tipChipPacksHaveBadges()).toBe(true);
    expect(tipperStatusFromCents(200)?.current?.name).toBe("Plaza Spark");
    expect(tipperStatusFromCents(25_000)?.current?.name).toBe("Faithful Tipper");
    const caption = buildTipperShareCaption({
      statusName: "Faithful Tipper",
      unlockedNames: ["Civic Hall"],
    });
    expect(caption.toLowerCase()).toContain("tipper");
    expect(caption.toLowerCase()).not.toContain("donor");
    expect(caption.toLowerCase()).toContain("not an investment");

    chipInLookFund({
      userId: "creator",
      userEmail: "c@test.com",
      displayName: "Creator Kim",
      packId: "look_100",
    });
    const board = getLookFundBoard("creator");
    expect(board.me?.status?.name).toBe("Civic Hall Tipper");
    expect(board.me?.chips.find((c) => c.packId === "look_100")?.unlocked).toBe(true);
    expect(board.me?.chips.find((c) => c.packId === "look_2")?.unlocked).toBe(false);
    expect(board.me?.shareCaption).toMatch(/Civic Hall Tipper/);
    expect(board.me?.shareCaption.toLowerCase()).not.toContain("donor");
  });

  it("blocks tax-deductible donation pitches", () => {
    expect(containsForbiddenUrWorldClaim("Give a tax-deductible charitable donation to UR World")).toBe(true);
  });
});
