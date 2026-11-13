/**
 * The owner asking Doctor, Administration, or Security AI to review code
 * or turn off the red banner is not a live attack. Filing that request as
 * an incident is what leaves the red banner up, waiting on "I APPROVE".
 */
export function isOwnerAuditClearanceRequest(text: string): boolean {
  const lower = text.toLowerCase();
  const foundPlanted =
    /found a backdoor|backdoor (was )?(found|detected|confirmed|planted)|unauthorized (admin|route|access) (found|detected|confirmed)/.test(
      lower,
    );
  if (foundPlanted) return false;

  const wantsBannerOff =
    /(remove|clear|dismiss|turn off|take down|stop).{0,48}(red )?(alert )?banner/.test(lower) ||
    /banner clearance/.test(lower) ||
    /clearance request/.test(lower) ||
    /red alert banner/.test(lower);

  const wantsAudit =
    /security audit|full security scan|scan for backdoors?|check(ing)? for backdoors?|no backdoors?|deep dive|tamper|static analy/.test(
      lower,
    ) && /user requested|please |run a |check (the )?(code|website|site)|make sure|go in and/.test(lower);

  return wantsBannerOff || wantsAudit;
}
