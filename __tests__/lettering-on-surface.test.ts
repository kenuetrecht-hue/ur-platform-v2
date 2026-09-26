import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import themeConfig from "../theme.config";

const ON_WHITE = "#4F46E5";
const ON_COLOR = "#FFD700";
const MUTED_ON_WHITE = "#6D28D9";

describe("lettering on white vs colored backgrounds", () => {
  it("uses bluish-purple body ink on white, and keeps gold for colored wash", () => {
    expect(themeConfig.themeColors.foreground.light).toBe(ON_WHITE);
    expect(themeConfig.themeColors.muted.light).toBe(MUTED_ON_WHITE);
    expect(themeConfig.themeColors.onWhite.light).toBe(ON_WHITE);
    expect(themeConfig.themeColors.gold.light).toBe(ON_COLOR);
    expect(themeConfig.themeColors.foreground.dark).toBe(ON_COLOR);
    expect(themeConfig.themeColors.onWhite.dark).toBe(ON_COLOR);

    const lettering = readFileSync("lib/gold-lettering.ts", "utf8");
    expect(lettering).toContain(`LETTERING_ON_WHITE = "${ON_WHITE}"`);
    expect(lettering).toContain(`LETTERING_ON_COLOR = "${ON_COLOR}"`);
    expect(lettering).toContain("applyDefaultLettering(LETTERING_ON_WHITE)");

    const css = readFileSync("global.css", "utf8");
    expect(css).toContain("color: #4f46e5");
    expect(css).toContain("--color-foreground: #4f46e5");
    expect(css).toContain("--color-muted: #6d28d9");
    expect(css).toContain("--color-onWhite: #4f46e5");
    expect(css).toContain("--color-gold: #ffd700");

    const provider = readFileSync("lib/theme-provider.tsx", "utf8");
    expect(provider).toContain("LETTERING_ON_WHITE");
    expect(provider).toContain("LETTERING_ON_COLOR");
    expect(provider).toContain('scheme === "light" ? LETTERING_ON_WHITE : LETTERING_ON_COLOR');

    const header = readFileSync("components/tab-screen-header.tsx", "utf8");
    expect(header).toContain("colors.gold");
    expect(header).not.toMatch(/backText.*colors\.primary/);

    const back = readFileSync("components/page-back-button.tsx", "utf8");
    expect(back).toContain("colors.gold");
    expect(back).not.toContain("colors.primary");

    const hubTabs = readFileSync("components/hub-tab-bar.tsx", "utf8");
    expect(hubTabs).toContain("colors.gold");

    const disclosure = readFileSync("components/platform-disclosure-bar.tsx", "utf8");
    expect(disclosure).toContain("colors.onWhite");

    const tiles = readFileSync("components/hub-door-tile.tsx", "utf8");
    expect(tiles).toContain("colors.onWhite");

    const launch = readFileSync("components/home-launch-promo-banner.tsx", "utf8");
    expect(launch).toContain("Launch window closed");
    expect(launch).toContain("colors.onWhite");
    expect(launch).not.toMatch(/Launch window closed[\s\S]{0,80}colors\.foreground/);

    const tabs = readFileSync("app/(tabs)/_layout.tsx", "utf8");
    expect(tabs).toContain("colors.onWhite");

    const landing = readFileSync("lib/landing-theme.ts", "utf8");
    expect(landing).toContain(`text: "${ON_COLOR}"`);
  });

  it("keeps Social, Profile, AIs, and Administration white-card copy on the purple token", () => {
    const social = readFileSync("components/social-feed-panel.tsx", "utf8");
    expect(social).toContain("Hide composer");
    expect(social).toMatch(/composerInput[\s\S]{0,80}colors\.foreground/);

    const profile = readFileSync("app/(tabs)/profile.tsx", "utf8");
    expect(profile).toContain("color: colors.foreground");
    expect(profile).toContain("colors.primary");

    const personalAi = readFileSync("components/personal-ai-interface.tsx", "utf8");
    expect(personalAi).toContain("Hi! I'm ContentMate");
    expect(personalAi).toMatch(/color: msg\.role === "user" \? "#fff" : colors\.foreground/);

    const usage = readFileSync("components/usage-allowance-banner.tsx", "utf8");
    expect(usage).toContain("Platform access active");
    expect(usage).toContain("color: colors.foreground");
    expect(usage).toContain("color: colors.muted");
    expect(usage).not.toContain("colors.gold");

    const creatorPanel = readFileSync("components/ai-creator-panel.tsx", "utf8");
    expect(creatorPanel).toContain("Learn the trade");
    expect(creatorPanel).toContain("active ? \"#fff\" : colors.foreground");

    const pricing = readFileSync("components/ai-specialist-pricing-panel.tsx", "utf8");
    expect(pricing).toContain("color: colors.foreground");
    expect(pricing).toContain("color: colors.muted");

    const ops = readFileSync("components/platform-ops-console.tsx", "utf8");
    expect(ops).toContain("📚 Learn");
    expect(ops).toContain("📌 Assign");
    expect(ops).toContain("active ? \"#fff\" : colors.foreground");
    expect(ops).toContain("Launch advertising budget");
    expect(ops).toContain("Launch advertising budget");
    expect(ops).toMatch(/colors\.foreground[\s\S]{0,220}Launch advertising budget/);

    const emanual = readFileSync("app/e-manual.tsx", "utf8");
    expect(emanual).toContain("color: colors.foreground");
  });

  it("uses bluish-purple on white cards and gold only on the colored wash", () => {
    const creatorAi = readFileSync("components/creator-ai-interface.tsx", "utf8");
    expect(creatorAi).toContain("disclosureBanner");
    expect(creatorAi).toContain("color: colors.onWhite");
    expect(creatorAi).toContain("backgroundColor: colors.surface");

    const ais = readFileSync("app/(tabs)/ais.tsx", "utf8");
    expect(ais).toContain("Done ▲");
    expect(ais).toMatch(/Done ▲[\s\S]{0,40}colors\.onWhite|colors\.onWhite[\s\S]{0,80}Done ▲/);

    const thanks = readFileSync("components/thanks-stamps-wall.tsx", "utf8");
    expect(thanks).toContain("backgroundColor: colors.surface");
    expect(thanks).toContain("const washInk = colors.foreground");
    expect(thanks).not.toContain("colors.gold");

    const purchase = readFileSync("components/purchase-usage-tracker.tsx", "utf8");
    expect(purchase).toContain("backgroundColor: colors.surface");
    expect(purchase).toContain("color: colors.foreground");
    expect(purchase).not.toContain("colors.gold");

    const talk = readFileSync("components/ai-talk-time-tracker.tsx", "utf8");
    expect(talk).toContain("backgroundColor: colors.surface");
    expect(talk).toContain("color: colors.foreground");
    expect(talk).not.toContain("colors.gold");

    const social = readFileSync("components/social-feed-panel.tsx", "utf8");
    expect(social).toMatch(/PLATFORM_DISCLOSURE_SHORT[\s\S]{0,80}colors\.onWhite|colors\.onWhite[\s\S]{0,80}PLATFORM_DISCLOSURE_SHORT/);

    const warning = readFileSync("components/warning-banner.tsx", "utf8");
    expect(warning).toContain("color: colors.onWhite");
    expect(warning).not.toContain("colors.gold");

    const hive = readFileSync("components/hive-town-hall-panel.tsx", "utf8");
    expect(hive).toMatch(/← Back[\s\S]{0,40}colors\.foreground|colors\.foreground[\s\S]{0,80}← Back/);

    const loyalty = readFileSync("components/daily-loyalty-banner.tsx", "utf8");
    expect(loyalty).toContain("loyalty points");
    expect(loyalty).toMatch(/color: colors\.onWhite[\s\S]{0,80}loyalty points|loyalty points[\s\S]{0,80}color: colors\.onWhite/);

    const linkCard = readFileSync("components/transaction-history-list.tsx", "utf8");
    expect(linkCard).toContain("Your custom link");
    expect(linkCard).toContain("color: colors.onWhite");
    expect(linkCard).toContain("customUrl");
  });

  it("uses a readable shared composer on every AI talk and send box", () => {
    const layout = readFileSync("lib/chat-composer-layout.ts", "utf8");
    expect(layout).toContain("CHAT_COMPOSER_HEIGHT = 300");
    expect(layout).toContain("CHAT_COMPOSER_MAX_HEIGHT = 600");
    expect(layout).toContain("CHAT_COMPOSER_FRAME");
    expect(layout).toContain("CHAT_COMPOSER_ACTION_ROW");
    expect(layout).toContain("flexWrap: \"nowrap\"");
    expect(layout).toContain("minHeight: CHAT_COMPOSER_HEIGHT");
    expect(layout).toContain("height: CHAT_COMPOSER_HEIGHT");
    expect(layout).toContain("CHAT_COMPOSER_LINES = 12");
    expect(layout).toContain("flexShrink: 1");
    expect(layout).toContain("minWidth: 72");
    expect(layout).toMatch(/CHAT_COMPOSER_FRAME:[\s\S]*?flexBasis: 0/);
    expect(layout).not.toMatch(/CHAT_COMPOSER_FRAME:[\s\S]*?width: "100%"/);
    expect(layout).toContain("fontSize: 17");

    const composer = readFileSync("components/chat-composer-input.tsx", "utf8");
    expect(composer).toContain("ur-chat-composer");
    expect(composer).toContain("<textarea");
    expect(composer).toContain("CHAT_COMPOSER_FRAME");
    expect(composer).toContain("underlineColorAndroid");
    expect(composer).toContain("numberOfLines={CHAT_COMPOSER_LINES}");

    const dock = readFileSync("components/composer-dock.tsx", "utf8");
    expect(dock).toContain("ChatComposerActionRow");
    expect(dock).toContain("KeyboardAvoidingView");
    expect(dock).toContain("useOverlapInsets");
    expect(dock).toContain("ur-chat-composer-footer");

    const css = readFileSync("global.css", "utf8");
    expect(css).toContain("textarea.ur-chat-composer");
    expect(css).toContain("height: 300px !important");
    expect(css).toContain(".ur-chat-composer-row");
    expect(css).toContain("flex-wrap: nowrap");

    const desks = [
      "components/creator-ai-interface.tsx",
      "components/personal-ai-interface.tsx",
      "components/language-ai-interface.tsx",
      "components/hive-town-hall-panel.tsx",
      "components/ai-creator-panel.tsx",
      "components/tech-builder-learn-panel.tsx",
      "components/game-forge-learn-panel.tsx",
      "components/voice-prompt-field.tsx",
      "components/live-session-room-panel.tsx",
    ];
    for (const file of desks) {
      const src = readFileSync(file, "utf8");
      expect(src).toContain("ChatComposerInput");
      expect(src.includes("ChatComposerActionRow") || src.includes("ChatSideComposer")).toBe(true);
    }
  });
});
