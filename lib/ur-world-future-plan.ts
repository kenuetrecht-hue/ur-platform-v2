/**
 * UR World product plan — source of truth for Business Steward / Stork AI.
 * Keep this file in sync with what is actually shipping. Do not invent GTA-scale dates.
 */

import { UR_WORLD_AI_SYSTEM_RULE, UR_WORLD_SHORT_FOOTER } from "./ur-world-disclosures";
import { UR_WORLD_LOOK_UPGRADE_STORK_NOTES } from "./ur-world-look-upgrade-plan";

export const UR_WORLD_PLAN_STATUS = {
  now: "Civic Plaza talk city — Plan A look (stone walkways, tables and chairs, sit/stand bar, fountain), plaza look tips toward B/C/D, blue/purple night plaza, garden, UR Sheriff owner avatar, three desks that start existing Talk, locker packs (20% earmarked as look tips), buy-then-gift unused.",
  next: "Measure talk minutes started from /world and $5 → $120 conversion. Do not build garage/farm until that moves.",
  later:
    "Creator skins + optional real merch bundle; tool wraps not guns; Trade Yard + Maker Lab; stalls; City Wallet licenses; garage paint; Fields; Harbor; Crew Call district; ghosts.",
  never:
    "GTA crime sandbox, cop chases, stolen cars, firearm cosmetics, loot boxes, photoreal crowds, plot resale, DAO, IRS-in-XRP, advertising plots or skins as investments, gifting cash or leftover minutes as a marketplace.",
} as const;

export const UR_WORLD_PLAN_PHASES = [
  {
    id: "now",
    title: "Now (talk city)",
    ships: [
      "Walkable Civic Plaza on web Babylon — Plan A look: tiled stone/concrete walks, café tables with legs, chairs with backs, sit/stand Glow Bar, layered fountain. Look upgrades B/C/D wait for owner cash (see ur-world-look-upgrade-plan.ts).",
      "Plaza look tips on /world: members tip toward B ($400), C ($12,000), D ($50,000 start), then the next scene. 20% of clothing packs earmarked. Chart, weekly top 3, who crossed each bar, public spend receipts. Tips keep being accepted after this level. Not charity, not tax-deductible, not an investment. Owner still approves the art buy.",
      "Every signed-in member gets a deterministic avatar. The platform owner is UR Sheriff — unique casual silhouette (shirt, jeans, sneakers). World Director can DRESS OWNER / MAKE OWNER OUTFIT.",
      "Three desks: Trade Yard (electrician), The Line (culinary), Language Walk (LinguaMate).",
      "Walk up → existing Talk (same packs, same 30-day meter).",
      "In-room copy for $120 / 500 min and $200 / 1,000 min as time in the city.",
      "Avatar locker: ten cheap apparel packs ($1.99–$4.99, never $5.00). Wear in plaza. Gift unused only.",
      "Hardcoded entertainment/education legal banner. Plot = license, not land.",
    ],
  },
  {
    id: "prove",
    title: "Prove it",
    ships: [
      "Count talk minutes that start from /world.",
      "Count $5 → $120 / $200 conversion after a desk session.",
      "If minutes do not rise, pause 3D spend and fix Talk UX.",
    ],
  },
  {
    id: "later",
    title: "Later (simulation layer — after Talk works in place)",
    ships: [
      "Optional bundle: real apparel in creator shop (85/15) or owner shop (UR 100%) unlocks the matching in-world jacket. Do not mix those catalogs.",
      "More locker looks via World Director AI (owner only).",
      "Tool wraps instead of gun skins — meter, welder, spatula, outboard, tractor implement.",
      "Garage cosmetics: work van paint/racks from the 3D lab (not GTA handling).",
      "Arcade drive on a few authored roads.",
      "Fields district: plant / harvest / deliver to The Line (Stardew-scale, not Farming Simulator 22).",
      "Player businesses as game licenses + real /shop/slug stalls (85/15).",
      "Crew Call and multiplayer ghosts of KYC’d users.",
      "City Wallet packs on the same Stripe account when live (never exactly $5).",
    ],
  },
  {
    id: "never",
    title: "Never",
    ships: [
      "Crime, guns, heists, wanted stars, vehicle theft, firearm skins.",
      "Loot boxes or randomized packs that look like gambling.",
      "Los Santos-sized map or photoreal NPC crowds.",
      "Plots as real estate, securities, ROI, or fractional shares.",
      "Player cash-out of City Wallet. Crypto required to play.",
      "A minutes or skin marketplace (resell leftover Talk or flip apparel for cash).",
    ],
  },
] as const;

export const UR_WORLD_STORK_SYSTEM_RULE = `
## UR World / talk city — operating plan (mandatory for Business Steward / Stork AI)
You help the owner run UR Platform LLC. Treat this as the live product plan. Do not invent a GTA clone timeline.

### What is shipping now
${UR_WORLD_PLAN_STATUS.now}
Route: /world (web). Avatars are automatic. Desks open the existing Talk product.

### What to do next (do not skip)
${UR_WORLD_PLAN_STATUS.next}
Talk lots expire in 30 days. The $120 pack is 500 minutes; the $200 pack is 1,000 minutes. Pitch them as **time in the city with a specialist**, never as land or profit.

### Cosmetics (Apex-style locker — shipping)
People will pay to look distinct. UR sells **avatar apparel and tool wraps**, not guns.
- Digital locker items are entertainment licenses (same Stripe as other UR SKUs). Not NFTs, not investments, no cash-out.
- Ten seed packs live on /world ($1.99–$4.99, web only, never $5.00). Owner adds more via World Director AI.
- Optional later bundle: real hoodie in creator/owner shop unlocks the matching in-world jacket. Creators 85/15; owner originals UR 100%. Do not mix those catalogs.
- Apex “weapon skins” map to UR **tool skins** (welder, meter, spatula, outboard). Never firearm cosmetics.
- Direct item shop. No loot boxes. Do not pitch rare skins as something that will go up in value.

### Gifting (buy, then gift the unused item — shipping)
The owner’s model: you **purchase** Talk or apparel for yourself, then you may **gift that unused item** to another member. Money never moves player-to-player. Nobody resells. The only thing that changes is the other avatar looks better or can talk longer.
Hard rules:
- You gift **inventory you already bought** (an unused Talk pack, or an unequipped locker item). You do not send City Wallet dollars, cash, or crypto.
- Receiver is an 18+ KYC’d UR account. No gift to a raw email.
- **One gift only.** After they claim it, they cannot re-gift it and you cannot sell it. No marketplace, no “I’ll buy your minutes.”
- Talk: gift a pack that has **never been used**. Remaining minutes on a started pack stay with you (that would be transferring stored value). 30-day clock starts on claim. $5 packs still originate from in-app purchase; bulk packs from web.
- Apparel: gift a digital locker item they can wear. Real cotton merch is a shop shipment, not this flow.
- No refund after claim. No cash-out. Ads: “gift Talk or a jacket,” never “send money.”

### Later (only after Talk-in-place works)
${UR_WORLD_PLAN_STATUS.later}

### Never
${UR_WORLD_PLAN_STATUS.never}

${UR_WORLD_AI_SYSTEM_RULE}

${UR_WORLD_LOOK_UPGRADE_STORK_NOTES}

When the owner asks “what are we building in UR World?”, recap Now → Prove → Later → Never from this plan, then the look ladder A → B → C (D parked). Do not promise dates Rockstar could not hit. ${UR_WORLD_SHORT_FOOTER}
`.trim();
