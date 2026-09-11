/**
 * Public Premiere-style Cartoon Studio sample on signup / age-verify.
 * Explains why ID front, ID back, and selfie are all required.
 * Does not skip the check. Built once for the door — we do not bill every visitor.
 */

import { publicCartoonProject, type CartoonProject, type CartoonScene } from "./cartoon-studio";

export const SIGNUP_KYC_CARTOON_ID = "signup-kyc-cartoon-sample";

export const SIGNUP_KYC_CARTOON_HEADLINE =
  "We get it — nobody loves this part. Thank you for doing it anyway.";

export const SIGNUP_KYC_CARTOON_BLURB =
  "This is a free Premiere-style sample of UR Cartoon Studio. Uri starts with the truth: we understand fully you do not want to do this. Then he explains why we still need the ID front, the ID back, and a live selfie — and he thanks you. The back is the extra step: it proves the card is real, not a screenshot of the front. The cartoon does not skip the check — you still photograph the three pictures.";

export const SIGNUP_KYC_CARTOON_QUALITY_NOTE =
  "Highest look we can ship on this page without charging every visitor. When card pay is live, the owner can buy one Premiere 4K film and swap it in. That is a one-time business-account job — not a charge on each signup.";

const URI = {
  name: "Uri",
  hair: "short" as const,
  shirt: "blue" as const,
  setting: "classroom" as const,
};

type SampleBeatId = "hook" | "front" | "back" | "selfie" | "privacy" | "close";

const BEATS: Array<{
  id: SampleBeatId;
  title: string;
  narration: string;
  caption: string;
}> = [
  {
    id: "hook",
    title: "Yeah… we know",
    narration:
      "Hi. I'm Uri. I understand fully you do not want to do this. Nobody wakes up excited to photograph an ID. Thanks for the extra step. We should still do it. Thank you for hanging in for thirty seconds.",
    caption: "Thank you. Here is why.",
  },
  {
    id: "front",
    title: "The front is the easy one",
    narration:
      "First, the front of a government ID. The side you already show at the store. Face, plus date of birth. That is how we know you are 18 or older, not a kid borrowing a grown-up name. Quick. Then the awkward extra.",
    caption: "Front = face + date of birth",
  },
  {
    id: "back",
    title: "The back is the 'really?' picture",
    narration:
      "Now the back. Yes, we are that friend who asks you to flip the card. The barcode, stripe, or passport code proves it is a real ID. A screenshot of the front alone is how stolen cards sneak in. That extra shot is why the grown-ups stay.",
    caption: "Back = real card, not a screenshot",
  },
  {
    id: "selfie",
    title: "And one not-so-glam selfie",
    narration:
      "Last, a live selfie. Bathroom lighting counts. Not a picture of the ID. Not your dog. Not a filter that turns you into a tiger. Just you. That proves you are the person on the card, not someone with a found wallet. Thank you. This is the part that keeps the thieves out.",
    caption: "Selfie = you, not the card",
  },
  {
    id: "privacy",
    title: "We are not keeping the album",
    narration:
      "Promise. UR does not keep the ID pictures. A checker looks only to confirm you are 18 or older, and that the selfie matches. We keep pass or fail, and a one-way fingerprint. Not a reusable copy. After you pass, your creator name locks so your work stays yours. That is the thank-you gift.",
    caption: "Pictures are not stored",
  },
  {
    id: "close",
    title: "Thank you — then you enter",
    narration:
      "This cartoon is a sample of what the website can make. Thank you for the extra step. You still take the three pictures. Front, back, and selfie. Then we check them. After they pass, you create the account or sign in.",
    caption: "Thank you. Photos are still required.",
  },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function letterboxAndMark(title: string, line: string): string {
  const safeTitle = escapeXml(title.slice(0, 52));
  const safeLine = escapeXml(line.slice(0, 88));
  return `
  <rect width="1280" height="64" fill="#05070c"/>
  <rect y="656" width="1280" height="64" fill="#05070c"/>
  <text x="640" y="42" text-anchor="middle" fill="#fde68a" font-size="22" font-family="Verdana, sans-serif" font-weight="700">${safeTitle}</text>
  <text x="640" y="698" text-anchor="middle" fill="#e2e8f0" font-size="18" font-family="Verdana, sans-serif">${safeLine}</text>
  <text x="80" y="688" fill="#94a3b8" font-size="16" font-family="Verdana, sans-serif" font-weight="700">UR Cartoon Studio · Premiere sample · Uri</text>
`;
}

function uriFigure(x: number, y: number, scale = 1): string {
  const s = scale;
  return `
  <ellipse cx="${x + 70 * s}" cy="${y + 8 * s}" rx="${58 * s}" ry="${26 * s}" fill="#1e3a5f"/>
  <circle cx="${x + 70 * s}" cy="${y + 42 * s}" r="${48 * s}" fill="#ffe0bd"/>
  <ellipse cx="${x + 70 * s}" cy="${y + 18 * s}" rx="${46 * s}" ry="${20 * s}" fill="#3e2723"/>
  <circle cx="${x + 52 * s}" cy="${y + 36 * s}" r="${6 * s}" fill="#1a1a1a"/>
  <circle cx="${x + 88 * s}" cy="${y + 36 * s}" r="${6 * s}" fill="#1a1a1a"/>
  <path d="M${x + 52 * s} ${y + 58 * s} Q ${x + 70 * s} ${y + 74 * s} ${x + 88 * s} ${y + 58 * s}" fill="none" stroke="#1a1a1a" stroke-width="${5 * s}" stroke-linecap="round"/>
  <rect x="${x + 36 * s}" y="${y + 88 * s}" width="${68 * s}" height="${86 * s}" rx="${22 * s}" fill="#1e88e5"/>
  <rect x="${x + 18 * s}" y="${y + 100 * s}" width="${22 * s}" height="${60 * s}" rx="${10 * s}" fill="#1e88e5"/>
  <rect x="${x + 100 * s}" y="${y + 100 * s}" width="${22 * s}" height="${60 * s}" rx="${10 * s}" fill="#1e88e5"/>
`;
}

function buildSampleFrame(beat: (typeof BEATS)[number]): string {
  const art = {
    hook: `
      <rect width="1280" height="720" fill="#070b14"/>
      <ellipse cx="640" cy="280" rx="280" ry="160" fill="#fbbf2433"/>
      <ellipse cx="640" cy="200" rx="90" ry="40" fill="#fde68a66"/>
      ${uriFigure(560, 210, 1.15)}
      <rect x="180" y="470" width="920" height="120" rx="20" fill="#111827ee"/>
      <text x="640" y="520" text-anchor="middle" fill="#fff" font-size="36" font-family="Verdana, sans-serif" font-weight="700">I get it. You don't want to do this.</text>
      <text x="640" y="566" text-anchor="middle" fill="#fde68a" font-size="24" font-family="Verdana, sans-serif">Thanks. We should still do it.</text>
    `,
    front: `
      <rect width="1280" height="720" fill="#0b1220"/>
      ${uriFigure(90, 220, 1.05)}
      <rect x="420" y="150" width="740" height="420" rx="28" fill="#1d4ed8"/>
      <rect x="440" y="170" width="700" height="380" rx="22" fill="#eff6ff"/>
      <rect x="470" y="210" width="170" height="210" rx="16" fill="#ffe0bd" stroke="#1e3a8a" stroke-width="6"/>
      <circle cx="555" cy="290" r="28" fill="#3e2723"/>
      <rect x="520" y="330" width="70" height="60" rx="16" fill="#1e88e5"/>
      <text x="680" y="240" fill="#1e3a8a" font-size="28" font-family="Verdana, sans-serif" font-weight="700">GOVERNMENT ID · FRONT</text>
      <rect x="680" y="270" width="400" height="22" rx="6" fill="#94a3b8"/>
      <rect x="680" y="308" width="320" height="18" rx="6" fill="#cbd5e1"/>
      <rect x="680" y="360" width="280" height="70" rx="12" fill="#f59e0b"/>
      <text x="820" y="406" text-anchor="middle" fill="#111827" font-size="28" font-family="Verdana, sans-serif" font-weight="700">DOB · 18+</text>
      <text x="790" y="500" text-anchor="middle" fill="#1e3a8a" font-size="22" font-family="Verdana, sans-serif">Face + birthday live here</text>
    `,
    back: `
      <rect width="1280" height="720" fill="#12080c"/>
      ${uriFigure(90, 220, 1.05)}
      <rect x="420" y="150" width="740" height="420" rx="28" fill="#334155"/>
      <rect x="440" y="170" width="700" height="380" rx="22" fill="#e2e8f0"/>
      <rect x="440" y="200" width="700" height="54" fill="#0f172a"/>
      <text x="790" y="236" text-anchor="middle" fill="#fde68a" font-size="22" font-family="Verdana, sans-serif" font-weight="700">MAGNETIC STRIPE</text>
      <g fill="#111827">
        <rect x="500" y="300" width="14" height="150"/>
        <rect x="524" y="300" width="8" height="150"/>
        <rect x="542" y="300" width="20" height="150"/>
        <rect x="572" y="300" width="6" height="150"/>
        <rect x="588" y="300" width="16" height="150"/>
        <rect x="614" y="300" width="10" height="150"/>
        <rect x="634" y="300" width="22" height="150"/>
        <rect x="666" y="300" width="7" height="150"/>
        <rect x="684" y="300" width="18" height="150"/>
        <rect x="712" y="300" width="9" height="150"/>
        <rect x="732" y="300" width="15" height="150"/>
        <rect x="758" y="300" width="6" height="150"/>
        <rect x="774" y="300" width="24" height="150"/>
      </g>
      <rect x="820" y="300" width="280" height="150" rx="16" fill="#b91c1c"/>
      <text x="960" y="360" text-anchor="middle" fill="#fff" font-size="26" font-family="Verdana, sans-serif" font-weight="700">NOT A</text>
      <text x="960" y="400" text-anchor="middle" fill="#fff" font-size="26" font-family="Verdana, sans-serif" font-weight="700">SCREENSHOT</text>
      <text x="790" y="520" text-anchor="middle" fill="#0f172a" font-size="22" font-family="Verdana, sans-serif" font-weight="700">BACK · barcode / stripe / passport code</text>
    `,
    selfie: `
      <rect width="1280" height="720" fill="#052e16"/>
      ${uriFigure(80, 230, 1)}
      <rect x="430" y="140" width="300" height="440" rx="36" fill="#111827"/>
      <rect x="452" y="178" width="256" height="340" rx="18" fill="#86efac"/>
      <circle cx="580" cy="300" r="54" fill="#ffe0bd"/>
      <ellipse cx="580" cy="268" rx="50" ry="22" fill="#3e2723"/>
      <circle cx="560" cy="292" r="6" fill="#111"/>
      <circle cx="600" cy="292" r="6" fill="#111"/>
      <path d="M556 324 Q 580 344 604 324" fill="none" stroke="#111" stroke-width="5"/>
      <rect x="530" y="360" width="100" height="80" rx="20" fill="#1e88e5"/>
      <circle cx="580" cy="548" r="16" fill="#22c55e"/>
      <text x="580" y="500" text-anchor="middle" fill="#052e16" font-size="22" font-family="Verdana, sans-serif" font-weight="700">LIVE SELFIE</text>
      <rect x="780" y="200" width="380" height="280" rx="20" fill="#7f1d1d"/>
      <text x="970" y="280" text-anchor="middle" fill="#fecaca" font-size="26" font-family="Verdana, sans-serif" font-weight="700">NOT this</text>
      <text x="970" y="330" text-anchor="middle" fill="#fff" font-size="22" font-family="Verdana, sans-serif">A photo of the ID</text>
      <text x="970" y="380" text-anchor="middle" fill="#fff" font-size="22" font-family="Verdana, sans-serif">or a stolen card</text>
      <line x1="800" y1="220" x2="1140" y2="460" stroke="#fecaca" stroke-width="10"/>
    `,
    privacy: `
      <rect width="1280" height="720" fill="#0f172a"/>
      ${uriFigure(90, 230, 1)}
      <rect x="400" y="180" width="200" height="140" rx="16" fill="#64748b" opacity="0.45"/>
      <rect x="620" y="180" width="200" height="140" rx="16" fill="#64748b" opacity="0.35"/>
      <rect x="840" y="180" width="200" height="140" rx="16" fill="#64748b" opacity="0.25"/>
      <text x="500" y="260" text-anchor="middle" fill="#e2e8f0" font-size="20" font-family="Verdana, sans-serif">FRONT</text>
      <text x="720" y="260" text-anchor="middle" fill="#e2e8f0" font-size="20" font-family="Verdana, sans-serif">BACK</text>
      <text x="940" y="260" text-anchor="middle" fill="#e2e8f0" font-size="20" font-family="Verdana, sans-serif">SELFIE</text>
      <path d="M500 330 L 720 430 L 940 330" fill="none" stroke="#fde68a" stroke-width="8"/>
      <rect x="560" y="400" width="320" height="160" rx="20" fill="#111827"/>
      <text x="720" y="460" text-anchor="middle" fill="#fde68a" font-size="26" font-family="Verdana, sans-serif" font-weight="700">PASS / FAIL + HASH</text>
      <text x="720" y="510" text-anchor="middle" fill="#e2e8f0" font-size="20" font-family="Verdana, sans-serif">Pictures are not kept</text>
      <text x="720" y="548" text-anchor="middle" fill="#86efac" font-size="20" font-family="Verdana, sans-serif">Creator name locks</text>
    `,
    close: `
      <rect width="1280" height="720" fill="#111827"/>
      ${uriFigure(70, 240, 1)}
      <rect x="320" y="200" width="260" height="280" rx="24" fill="#1d4ed8"/>
      <text x="450" y="340" text-anchor="middle" fill="#fff" font-size="32" font-family="Verdana, sans-serif" font-weight="700">FRONT</text>
      <rect x="610" y="200" width="260" height="280" rx="24" fill="#b45309"/>
      <text x="740" y="340" text-anchor="middle" fill="#fff" font-size="32" font-family="Verdana, sans-serif" font-weight="700">BACK</text>
      <rect x="900" y="200" width="260" height="280" rx="24" fill="#15803d"/>
      <text x="1030" y="340" text-anchor="middle" fill="#fff" font-size="32" font-family="Verdana, sans-serif" font-weight="700">SELFIE</text>
      <text x="740" y="540" text-anchor="middle" fill="#fde68a" font-size="28" font-family="Verdana, sans-serif" font-weight="700">Thank you — then you enter</text>
    `,
  } satisfies Record<SampleBeatId, string>;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  ${art[beat.id]}
  ${letterboxAndMark(beat.title, beat.caption)}
</svg>`;
}

function buildSignupKycCartoonProject(): ReturnType<typeof publicCartoonProject> {
  const createdAt = "2026-09-06T00:00:00.000Z";
  const scenes: CartoonScene[] = BEATS.map((beat, index) => {
    const order = index + 1;
    return {
      id: `${SIGNUP_KYC_CARTOON_ID}-scene-${order}`,
      order,
      title: beat.title,
      narration: beat.narration,
      caption: beat.caption,
      durationSeconds: 6,
      visualPrompt: `premiere educational cartoon: ${beat.title}`,
      frameSvg: buildSampleFrame(beat),
      voiceEnabled: true,
      musicMood: "lesson",
      musicVolume: 40,
    };
  });

  const project: CartoonProject = {
    id: SIGNUP_KYC_CARTOON_ID,
    userId: "ur-platform-public-sample",
    title: "Why we ask for ID front, ID back, and a selfie",
    idea: "Uri explains why both sides of the ID plus a live selfie are required, as a free Premiere-style Cartoon Studio sample.",
    style: "educational",
    script: scenes.map((scene) => scene.narration).join(" "),
    scenes,
    totalSeconds: scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0),
    tier: "premiere",
    billedSeconds: 0,
    paid: true,
    complimentary: true,
    renderStatus: "ready",
    engineNote: SIGNUP_KYC_CARTOON_QUALITY_NOTE,
    fromFootage: false,
    characterName: URI.name,
    characterLook: URI,
    publishedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
  };

  return publicCartoonProject(project);
}

export const SIGNUP_KYC_CARTOON_SAMPLE = buildSignupKycCartoonProject();
