export const PASSWORD_REMIND_DAY_CHOICES = [30, 60, 90] as const;
export type PasswordRemindDays = (typeof PASSWORD_REMIND_DAY_CHOICES)[number] | 0;

export const PASSWORD_CHANGED_AT_KEY = "passwordChangedAt";
export const PASSWORD_REMIND_DAYS_KEY = "passwordRemindDays";

export function normalizePasswordRemindDays(value: unknown): PasswordRemindDays {
  if (value === 30 || value === 60 || value === 90) return value;
  if (value === "30" || value === "60" || value === "90") {
    return Number(value) as 30 | 60 | 90;
  }
  return 0;
}

export function isPasswordChangeDue(params: {
  changedAt: string | null | undefined;
  remindDays: PasswordRemindDays;
  nowMs?: number;
}): boolean {
  if (!params.remindDays) return false;
  if (!params.changedAt) return true;
  const changedMs = Date.parse(params.changedAt);
  if (!Number.isFinite(changedMs)) return true;
  const nowMs = params.nowMs ?? Date.now();
  const ageDays = (nowMs - changedMs) / (24 * 60 * 60 * 1000);
  return ageDays >= params.remindDays;
}

export function passwordRemindCopy(remindDays: PasswordRemindDays): string {
  if (!remindDays) return "Change your password whenever you want. No calendar reminder.";
  return `We will remind you every ${remindDays} days. You can still change it any day.`;
}
