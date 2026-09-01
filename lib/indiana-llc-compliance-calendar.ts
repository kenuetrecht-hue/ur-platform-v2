/**
 * Educational Indiana LLC / federal calendar for the owner-only Business Steward.
 * Not tax, legal, or accounting advice — confirm with a licensed CPA and IRS / INTIME notices.
 */

export const COMPLIANCE_CALENDAR_DISCLAIMER =
  "Educational reminder calendar only. Not tax, legal, or accounting advice. Confirm amounts and forms with a licensed CPA and the IRS / Indiana DOR. Due dates move to the next business day when they fall on a weekend or federal holiday.";

export type ComplianceReminder = {
  id: string;
  when: string;
  title: string;
  notes: string;
};

/** Recurring items for a calendar-year Indiana LLC owner (typical single-member or pass-through). */
export const INDIANA_LLC_COMPLIANCE_ITEMS: ComplianceReminder[] = [
  {
    id: "fed-es-apr",
    when: "April 15",
    title: "Federal estimated income tax (Form 1040-ES) — 1st installment",
    notes: "Pay if you expect to owe $1,000+ after withholding. IRS Direct Pay or EFTPS.",
  },
  {
    id: "in-es-apr",
    when: "April 15",
    title: "Indiana estimated state/county tax (Form ES-40) — 1st installment",
    notes: "Separate from federal. INTIME or mailed ES-40. Indiana threshold is typically $1,000+ state+county after withholding.",
  },
  {
    id: "fed-es-jun",
    when: "June 15",
    title: "Federal estimated tax — 2nd installment",
    notes: "Same 1040-ES series as April.",
  },
  {
    id: "in-es-jun",
    when: "June 15",
    title: "Indiana estimated tax — 2nd installment",
    notes: "INTIME or ES-40.",
  },
  {
    id: "fed-es-sep",
    when: "September 15",
    title: "Federal estimated tax — 3rd installment",
    notes: "Next 2026 payment after June.",
  },
  {
    id: "in-es-sep",
    when: "September 15",
    title: "Indiana estimated tax — 3rd installment",
    notes: "Pay federal and Indiana as two payments.",
  },
  {
    id: "fed-es-jan",
    when: "January 15 (following year)",
    title: "Federal estimated tax — 4th installment",
    notes: "For 2026 income this is January 15, 2027.",
  },
  {
    id: "in-es-jan",
    when: "January 15 (following year)",
    title: "Indiana estimated tax — 4th installment",
    notes: "For 2026 income this is January 15, 2027.",
  },
  {
    id: "fed-1040",
    when: "April 15 (following year)",
    title: "Federal annual return (typically Form 1040 if disregarded LLC)",
    notes: "Partnership Form 1065 is generally March 15 if the LLC is taxed as a partnership. Confirm your election with a CPA.",
  },
  {
    id: "in-it40",
    when: "April 15 (following year)",
    title: "Indiana annual individual return (typically IT-40)",
    notes: "Entity returns (IT-65 / IT-20S) follow the federal entity due date if you elected partnership or S-corp treatment.",
  },
  {
    id: "in-biz-report",
    when: "Last day of formation anniversary month, every 2 years",
    title: "Indiana Business Entity Report (INBiz)",
    notes: "About $32 online. Not an income-tax return. Check your due month on inbiz.in.gov.",
  },
];

export function formatComplianceCalendarForPrompt(): string {
  const lines = INDIANA_LLC_COMPLIANCE_ITEMS.map(
    (item) => `- ${item.when} — ${item.title}. ${item.notes}`,
  );
  return `${COMPLIANCE_CALENDAR_DISCLAIMER}\n\n${lines.join("\n")}`;
}
