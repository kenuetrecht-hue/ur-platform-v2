/**
 * Plain-language signup + ID-check explanations.
 * What to do, why, what UR keeps, what Google sees, what we never sell.
 */

export const SIGNUP_PAGE_TITLE = "Create your account";

export const SIGNUP_PAGE_WHY =
  "This is how you join. Hear Uri, take the three pictures, and wait for them to pass. Then you can create a real adult account so we can keep fraud off the website and so a creator’s videos, classes, and posts stay theirs — not anyone who copies them.";

export const LOGIN_PAGE_WHY =
  "Hear Uri and take the three pictures first. After they pass the check, sign in with the email and password you created. That is how we know it is you, not someone else using your name.";

export const ID_MUST_PASS_FIRST =
  "Check the three pictures first. Create-account and sign-in only unlock after they pass.";

export const PICTURES_PASSED_SIGN_IN_NEXT =
  "Your pictures passed. Sign in or create an account next. You do not need to take the pictures again.";

export const SIGNUP_FIELDS = [
  {
    id: "name",
    label: "Name",
    doThis: "Type the name people should see on your account.",
    why: "We store this as your display name so members and creators know who they are dealing with. It is not sold.",
  },
  {
    id: "email",
    label: "Email",
    doThis: "Type an email you can open.",
    why: "This is how you sign back in, and how we reach you if we learn account information was stolen. We do not sell your email.",
  },
  {
    id: "password",
    label: "Password",
    doThis: "Choose a password at least 6 characters long. Do not reuse a password from another site if you can help it.",
    why: "Your password is stored as a hash by the sign-in service (Supabase). UR staff cannot read the password.",
  },
  {
    id: "referral",
    label: "Referral code (optional)",
    doThis: "If an affiliate sent you, type their code. If not, leave it blank.",
    why: "This only ties the account to that affiliate’s payout. It is not a credit-card or ID field.",
  },
  {
    id: "role",
    label: "I am a…",
    doThis: "Tap the role that matches how you will use UR — creator, affiliate, worker, or 3D / print.",
    why: "This turns on the right dashboard later. You are not buying anything on this screen.",
  },
  {
    id: "terms",
    label: "Terms of Use",
    doThis: "Read the Terms and check the box if you agree.",
    why: "We record that you agreed, and when. That is how we prove you saw the 18+ rule, the no-refund rule, and the conduct rules.",
  },
  {
    id: "cloudflare",
    label: "Cloudflare security check",
    doThis: "Complete the “I am not a robot” box if it appears.",
    why: "Cloudflare Turnstile stops bots from opening fake accounts. It is not the ID check.",
  },
] as const;

export const AGE_VERIFY_TITLE = "ID front, ID back, and a live selfie";

export const AGE_VERIFY_WHAT_TO_DO =
  "Photograph a government ID (front and back) and a live selfie of your face. Use your own ID. The selfie must be your face — not a picture of the ID.";

export const AGE_VERIFY_WHY = [
  "We do this to keep fraud off the website — fake names, stolen accounts, and people pretending to be someone else.",
  "We also do this so creator content stays with the creator who made it. After this check, your creator name is locked. Other people cannot republish your work as their own and farm your views.",
  "UR Platform is also for adults 18 and older. AI chat, social features, and payments are not for minors.",
] as const;

export const AGE_VERIFY_THIRD_PARTY =
  "UR Platform does not keep the ID pictures. A third party — Google’s AI checker — looks at the three photos only long enough to confirm you are 18+ and that the selfie is the same person as the ID. It is told not to write down ID numbers or your address.";

export const AGE_VERIFY_WHAT_WE_KEEP =
  "After the check, UR keeps only: pass or fail, the time it passed, and a one-way fingerprint (hash) of the three files so we know the check happened. We do not store a reusable copy of your ID or selfie on this website.";

export const AGE_VERIFY_PHOTO_HINTS = {
  front: "What to do: photograph the front of your driver license, state ID, passport photo page, or national ID. Why: that page has your face and date of birth so we can confirm you are 18+.",
  back: "What to do: photograph the back (barcode, stripe, or passport MRZ). Why: that proves it is a real ID, not a screenshot of the front only.",
  selfie:
    "What to do: take a live selfie of your face in the light. Why: this proves you are the person on the ID, not someone using a stolen card.",
} as const;

export const WHAT_UR_STORES_ON_THE_WEBSITE = [
  "Your name and email",
  "A hashed password at the sign-in service — not the password itself",
  "The role you picked and later creator or affiliate enrollment",
  "That you accepted the Terms and the conduct rules, and when",
  "18+ pass or fail, plus photo hashes — not the ID pictures",
  "Purchases, tickets, and messages you send inside UR (as the Terms say)",
] as const;

export const WHAT_UR_DOES_NOT_STORE = [
  "A reusable copy of your ID front, ID back, or selfie",
  "Your driver-license number or home address from the ID",
  "Your password in plain text",
] as const;

export const DATA_NOT_SOLD =
  "UR Platform LLC does not sell your information and does not give it away to marketers or data brokers. We share it only when the law requires it — for example a lawful request from the authorities.";

export const SECURITY_BREACH_PROMISE =
  "If we learn that someone stole account information, we notify you immediately on this website so you can change your password and protect yourself. The same notice is queued for the email on your account.";

export const CONDUCT_PAGE_WHY =
  "Read these rules and check the box. This is how we keep the site friendly and how we prove you agreed. Harassment, hate groups, and crime are not allowed. Chats and posts inside UR are saved, timestamped, and translated to English for owner review.";

export const LOGIN_FIELDS = [
  {
    id: "email",
    label: "Email",
    doThis: "Type the email you used to join.",
    why: "That is the key to your account. We do not sell it.",
  },
  {
    id: "password",
    label: "Password",
    doThis: "Type your password.",
    why: "This proves it is you. After a security notice, change it if you used this password anywhere else.",
  },
] as const;

export function formatStoredInformationList(): string {
  return WHAT_UR_STORES_ON_THE_WEBSITE.map((item) => `• ${item}`).join("\n");
}

export function signupPrivacyBlock(): string {
  return [
    AGE_VERIFY_THIRD_PARTY,
    AGE_VERIFY_WHAT_WE_KEEP,
    "What stays on the website:",
    formatStoredInformationList(),
    DATA_NOT_SOLD,
    SECURITY_BREACH_PROMISE,
  ].join("\n\n");
}
