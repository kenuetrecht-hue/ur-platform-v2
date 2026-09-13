import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import {
  isPasswordChangeDue,
  normalizePasswordRemindDays,
  passwordRemindCopy,
} from "../lib/password-hygiene";

describe("password hygiene", () => {
  it("lets everyone change a password any day and reminds at 30, 60, or 90 days", () => {
    expect(normalizePasswordRemindDays(90)).toBe(90);
    expect(normalizePasswordRemindDays("off")).toBe(0);
    expect(
      isPasswordChangeDue({
        changedAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString(),
        remindDays: 90,
      }),
    ).toBe(true);
    expect(
      isPasswordChangeDue({
        changedAt: new Date().toISOString(),
        remindDays: 30,
      }),
    ).toBe(false);
    expect(isPasswordChangeDue({ changedAt: null, remindDays: 0 })).toBe(false);
    expect(passwordRemindCopy(60)).toMatch(/60 days/);
    const settings = readFileSync("app/profile/settings.tsx", "utf8");
    const card = readFileSync("components/change-password-card.tsx", "utf8");
    const home = readFileSync("app/(tabs)/index.tsx", "utf8");
    expect(settings).toContain("ChangePasswordCard");
    expect(card).toContain("Every {days} days");
    expect(card).toContain("PASSWORD_REMIND_DAY_CHOICES");
    expect(card).toContain("Only when I want");
    expect(home).toContain("PasswordRemindBanner");
  });
});

describe("start-over scrap", () => {
  it("clears ID records when the owner wipes sign-in", () => {
    const service = readFileSync("server/_core/owner-signin-reset-service.ts", "utf8");
    const kyc = readFileSync("server/_core/age-kyc-service.ts", "utf8");
    expect(service).toContain("clearAgeKycRecordsForEmail");
    expect(kyc).toContain("deleteKycVerification");
    expect(readFileSync("server/db.ts", "utf8")).toContain("listUsersByEmail");
  });
});
