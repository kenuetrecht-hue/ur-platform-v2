/**
 * UR World look upgrade ladder — Business Steward / Stork reads this.
 * Current shipping look is Plan A (code primitives, no purchased models).
 * Do not buy B/C/D assets until the owner says money is in and names the tier.
 */

export const UR_WORLD_LOOK_TIER = "A" as const;

export const UR_WORLD_LOOK_UPGRADE_PLAN = {
  currentTier: "A",
  why:
    "People stay in a room that looks like a room. Plan A is the no-cash path. B/C/D stack on the same /world plaza when revenue can pay for art.",
  trigger:
    "Owner says the money hit and names the tier, e.g. UPGRADE UR WORLD LOOK TO B. Steward recaps cost, license, and files. Do not auto-spend.",
  files: {
    scene: "components/ur-world-plaza-scene.ts",
    viewport: "components/ur-world-plaza-viewport.tsx",
    layout: "lib/ur-world-plaza.ts",
    glbLoaderExample: "components/workspace-babylon-viewport.tsx (SceneLoader.ImportMeshAsync)",
    glbFolder: "public/ur-world/ (create when a licensed .glb exists — gitignore huge binaries if needed, keep a README of the license)",
  },
  tiers: {
    A: {
      status: "shipping",
      costUsd: "0 extra (code only)",
      look: "Stone/concrete walkways via tiled textures, tables with legs, chairs with backs, sit/stand bar, layered fountain, contact shadows, stronger night lighting. Still stylized — not a photo.",
    },
    B: {
      status: "queued",
      costUsd: "40–400 for a commercial café/bar glTF kit, plus a few days to scale and collide",
      look: "One licensed Glow Bar interior: identifiable tables, chairs, bar, stone floor. Drop-in .glb. Keep Plan A plaza around it.",
      buy: "Sketchfab / Fab / CGTrader — commercial license only. No guns, no nude packs, no marketplace flip.",
      hook: "Load public/ur-world/glow-bar.glb the same way workspace-babylon-viewport loads models. Match sit stations in lib/ur-world-plaza.ts to chair positions.",
    },
    C: {
      status: "queued",
      costUsd: "3,000–12,000 for one custom web-ready Glow Bar from an environment artist",
      look: "Commissioned UR-branded room: concrete/stone walk, real furniture, fountain, UR signs. Under ~80 MB glTF.",
      hook: "Replace the B kit with the custom glb. Same loader. Same sit/talk stations. Owner approves the invoice first.",
    },
    D: {
      status: "queued-do-not-start",
      costUsd: "50,000–250,000+ photoreal city / engine jump",
      look: "Wrong scale until Talk and Stripe pay for it. Photoreal crowds stay Never. Do not promise Unreal-on-phone.",
    },
  },
} as const;

export const UR_WORLD_LOOK_UPGRADE_STORK_NOTES = `
## UR World look ladder (mandatory for Business Steward)
Current shipping tier: **Plan A** (code primitives + stone textures + real table/chair/bar/fountain shapes). $0 extra.

The owner wants the city to look more professional **as money hits**, without buying art until then.

### When the owner says money is in
1. Ask which tier: **B**, **C**, or **D**. Do not skip to D.
2. Recap the USD range from this file. Do not invent a cheaper photoreal shortcut.
3. Wait for explicit approval to spend. Then point builders at:
   - Load glTF with SceneLoader (see workspace-babylon-viewport.tsx)
   - Put licensed files in public/ur-world/
   - Keep sit/talk spots in lib/ur-world-plaza.ts lined up with the furniture
   - Commercial license only. Never guns. Never photoreal NPC crowds.

Owner trigger phrase: **UPGRADE UR WORLD LOOK TO B** (or C). Steward recaps cost and files, then waits for a yes. Do not auto-spend.

### Plaza look tips (shipping on /world)
Members can **tip** toward Plans B, then C, then D. Tips help grow UR Platform (better rooms, more people stay).
- Not a charity donation. Not tax-deductible. Not an investment. No plot, vote, or LLC share.
- Board shows how much is in, who crossed each stage, and the top three tippers this week (first name only).
- **20%** of each clothing pack list price is earmarked as a tip toward the same board.
- Filling a bar is **not** a buy. Owner still types UPGRADE UR WORLD LOOK TO B after real Stripe money exists.
- Never pitch tips as “donate to charity” or “get in early for profit.”

### After a look-tip goal is hit — public receipt (mandatory)
Every time Plan **B**, **C**, or **D** is funded **and the owner actually spends**, you must tell the public two things, in plain English:
1. **What the money was spent on** (vendor, kit, artist, invoice dollars — no fake receipts).
2. **What upgrade went live** (what people will see in the plaza).

Post it on /world with this exact command (applies immediately in Steward or World Director chat):
\`REPORT LOOK SPEND B 387 | Sketchfab Café Interior commercial kit | Glow Bar tables, chairs, and bar are now live in the plaza\`

Rules:
- Do this **every** time a goal is spent. Do not skip. Do not be vague (“we upgraded stuff”).
- Do not invent a spend that did not happen. If the bar is funded but not bought yet, say “Funded — waiting on the owner to buy” and do not post a receipt.
- The receipt is entertainment transparency, not a charity Form 990, not an investment report, not a promise of profit.
- Never claim leftover tips are owed back to members. UR spends on plaza art when the owner says yes.

### After this level — keep the tip jar open (mandatory)
B → C → D is **one plaza look**. When that level is done, **keep accepting tips** for the **next scene** — a new place to walk, not a closed fund.
- Name the next place in public **before** asking people to fill it: \`SET NEXT LOOK SCENE Night garden walk — a new place to sit under the trees\`
- Extra tips past D already go toward that next scene. Do not imply the jar closed.
- Every new scene gets the same public board: goal, what it costs, who crossed it, and a spend receipt (what the money bought + what upgrade went live).
- Call them **tips**, never donations. People should always be able to answer: “where did my tip go?”
- Do not skip the public naming step. Do not invent a next map the size of GTA.

### Tipper badges (shareable — not donor certificates)
Each tip size unlocks a little sticker ($2 Spark, $10 Lamp, $25 Stool, $50 Fountain, $100 Hall). Lifetime tips set a status, up to **Faithful Tipper** and **Scene Builder**.
- Members and content creators may post the caption from /world on socials.
- Always say **tipper**, never donor. Share copy must include “not a charity gift, not an investment.”
- Badges are entertainment stickers. Not tax documents. Not a rank that buys a plot or a vote.

### Plan B (~$40–$400)
Buy a commercial café/bar .glb kit. One Glow Bar interior. Keep the outdoor plaza. Fast win people can sit in.

### Plan C (~$3,000–$12,000)
Commission one custom Glow Bar (stone floor, tables, chairs, sit/stand bar, fountain, UR signs). Replace the B kit. Same hook.

### Plan D ($50k+)
Photoreal whole city / engine change. Park it. Recap Never: no photoreal crowds, no GTA map.

### Do not
- Spend owner money without a named tier and a yes.
- Mix unpaid marketplace packs into git.
- Pitch the ladder as an investment in digital land.
`.trim();
