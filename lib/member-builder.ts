/**
 * Member builders: TechBuilder (websites and logos), GameForge, ChainSmith, Logo & Brand.
 * They teach the code and can save a sandbox project. They do not change urplatform.llc.
 */

import { sandboxLayerAdvice } from "./sandbox-layers";

export type MemberBuilderKind = "website" | "logo" | "game" | "chain";

const BUILDERS: Record<string, MemberBuilderKind[]> = {
  "ai-coder-001": ["website", "logo"],
  "ai-logo-brand-001": ["logo"],
  "ai-game-dev-001": ["game"],
  "ai-blockchain-001": ["chain"],
};

export function memberBuilderKinds(creatorId: string): MemberBuilderKind[] {
  return BUILDERS[creatorId] ?? [];
}

export function isMemberBuilder(creatorId: string): boolean {
  return memberBuilderKinds(creatorId).length > 0;
}

export function isMemberBuildRequest(text: string): boolean {
  const lower = text.toLowerCase();
  const asks =
    /\b(build|make|create|code|design|write|teach me to (build|code|write))\b/.test(lower);
  const subject =
    /\b(website|web site|site|webpage|web page|landing|app|logo|brand|svg|game|crypto|blockchain|chain|smart contract|contract)\b/.test(
      lower,
    );
  return asks && subject;
}

export function memberBuildKind(creatorId: string, text: string): MemberBuilderKind | null {
  const kinds = memberBuilderKinds(creatorId);
  if (!kinds.length || !isMemberBuildRequest(text)) return null;
  const lower = text.toLowerCase();
  if (kinds.includes("logo") && /\b(logo|brand|svg)\b/.test(lower)) return "logo";
  if (kinds.includes("game") && /\bgame\b/.test(lower)) return "game";
  if (kinds.includes("chain") && /\b(crypto|blockchain|chain|contract)\b/.test(lower)) return "chain";
  if (kinds.includes("website")) return "website";
  return kinds[0] ?? null;
}

export type StarterFile = { path: string; content: string };

export function starterFilesFor(kind: MemberBuilderKind): StarterFile[] {
  if (kind === "website") {
    return [
      {
        path: "index.html",
        content: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>My site</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header><h1>My site</h1></header>
  <main><p>Replace this text with your own page.</p></main>
  <script src="main.js"></script>
</body>
</html>
`,
      },
      {
        path: "styles.css",
        content: `body { font-family: Georgia, serif; margin: 2rem; background: #f7f4ef; color: #1c1917; }
h1 { font-size: 2rem; }
`,
      },
      {
        path: "main.js",
        content: `document.querySelector("main")?.setAttribute("data-ready", "yes");
`,
      },
    ];
  }
  if (kind === "logo") {
    return [
      {
        path: "logo.svg",
        content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Original mark">
  <rect width="128" height="128" rx="24" fill="#1c1917"/>
  <circle cx="64" cy="64" r="28" fill="#f4f1ea"/>
</svg>
`,
      },
      {
        path: "brand.html",
        content: `<!doctype html>
<html lang="en">
<body style="font-family: sans-serif; padding: 2rem;">
  <h1>Brand sheet</h1>
  <img src="logo.svg" width="128" height="128" alt="Original mark" />
  <p>Colors: ink #1c1917, paper #f4f1ea. Draw your own mark. Do not copy a famous logo.</p>
</body>
</html>
`,
      },
    ];
  }
  if (kind === "game") {
    return [
      {
        path: "index.html",
        content: `<!doctype html>
<html lang="en">
<body style="margin:0;background:#111;color:#fff;font-family:sans-serif;">
  <canvas id="game" width="480" height="320"></canvas>
  <script src="game.js"></script>
</body>
</html>
`,
      },
      {
        path: "game.js",
        content: `const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let x = 40;
function frame() {
  x = (x + 2) % canvas.width;
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(x, 140, 24, 24);
  requestAnimationFrame(frame);
}
frame();
`,
      },
    ];
  }
  return [
    {
      path: "chain.js",
      content: `// Teaching chain. Not Bitcoin. Not Ethereum. No real money.
function teachingHash(text) {
  let h = 2166136261;
  for (const ch of text) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function makeBlock(index, data, previousHash) {
  const body = index + "|" + data + "|" + previousHash;
  return { index, data, previousHash, hash: teachingHash(body) };
}

const genesis = makeBlock(0, "genesis", "0");
const next = makeBlock(1, "hello", genesis.hash);
console.log(genesis, next);
`,
    },
  ];
}

export function memberBuilderPrompt(kind: MemberBuilderKind): string {
  const teach =
    "Teach the person to write this themselves. Explain each important line in plain language, then give them one small change to try. Original work only.";
  const layers = sandboxLayerAdvice(kind);
  if (kind === "website") {
    return `${teach} You are building a website in their sandbox (index.html, styles.css, main.js). Match what they asked for. Do not copy a famous site. ${layers}`;
  }
  if (kind === "logo") {
    return `${teach} You are building an original logo as SVG in logo.svg plus a short brand.html sheet. Do not copy a trademark or a famous mark. No script tags inside the SVG. ${layers}`;
  }
  if (kind === "game") {
    return `${teach} You are building a small original game in index.html and game.js. No cheats, no DRM bypass, no asset theft. ${layers}`;
  }
  return `${teach} You are building a teaching blockchain in chain.js. Say clearly it is not Bitcoin or Ethereum and it moves no real money. No investment advice, mixers, key theft, or exploit kits. ${layers}`;
}
