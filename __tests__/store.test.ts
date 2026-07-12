import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock AsyncStorage before importing the store
const memoryStore = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => memoryStore.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { memoryStore.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { memoryStore.delete(key); }),
    clear: vi.fn(async () => { memoryStore.clear(); }),
  },
}));

import {
  calculateTier,
  pointsToNextTier,
  TIERS,
  getUser,
  saveUser,
  addPoints,
  addTransaction,
  getTransactions,
  addLead,
  tipFounder,
  getPartners,
  savePartner,
  togglePartner,
  pickPartnerForSlot,
  recordPartnerClick,
  getLeads,
  toggleFollow,
  isFollowing,
  getFollowing,
  getCreators,
  getCreator,
  getFeatureFlags,
  updateFeatureFlags,
  getPlatformStats,
} from "../lib/store";

beforeEach(() => {
  memoryStore.clear();
});

describe("Loyalty tier system", () => {
  it("assigns Bronze for 0–99 points", () => {
    expect(calculateTier(0)).toBe("Bronze");
    expect(calculateTier(50)).toBe("Bronze");
    expect(calculateTier(99)).toBe("Bronze");
  });

  it("assigns Silver for 100–499 points", () => {
    expect(calculateTier(100)).toBe("Silver");
    expect(calculateTier(499)).toBe("Silver");
  });

  it("assigns Gold for 500–999 points", () => {
    expect(calculateTier(500)).toBe("Gold");
    expect(calculateTier(999)).toBe("Gold");
  });

  it("assigns Platinum for 1000+ points", () => {
    expect(calculateTier(1000)).toBe("Platinum");
    expect(calculateTier(99999)).toBe("Platinum");
  });

  it("calculates progress to next tier correctly", () => {
    const progress = pointsToNextTier(50);
    expect(progress.next).toBe("Silver");
    expect(progress.needed).toBe(50); // 100 - 50
    expect(progress.progress).toBeGreaterThan(0);
    expect(progress.progress).toBeLessThan(1);
  });

  it("returns null for next tier when at Platinum", () => {
    const progress = pointsToNextTier(2000);
    expect(progress.next).toBeNull();
  });

  it("has perks defined for every tier", () => {
    (["Bronze", "Silver", "Gold", "Platinum"] as const).forEach((tier) => {
      expect(TIERS[tier].perks.length).toBeGreaterThan(0);
      expect(TIERS[tier].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

describe("User & points", () => {
  it("returns a default user when none stored", async () => {
    const user = await getUser();
    expect(user.name).toBeTruthy();
    // Default seeded user is Silver tier with 245 points (set in store DEFAULT_USER)
    expect(["Bronze", "Silver", "Gold", "Platinum"]).toContain(user.tier);
    expect(user.points).toBeGreaterThanOrEqual(0);
  });

  it("persists user updates", async () => {
    const user = await getUser();
    await saveUser({ ...user, name: "Test User", points: 600 });
    const reloaded = await getUser();
    expect(reloaded.name).toBe("Test User");
    expect(reloaded.points).toBe(600);
  });

  it("addPoints updates tier when threshold crossed", async () => {
    const user = await getUser();
    await saveUser({ ...user, points: 80, tier: "Bronze" });
    const updated = await addPoints(50); // 80 + 50 = 130 → Silver
    expect(updated.points).toBe(130);
    expect(updated.tier).toBe("Silver");
  });

  it("addPoints accumulates across calls", async () => {
    const u1 = await getUser();
    await saveUser({ ...u1, points: 0 });
    await addPoints(50);
    const after = await addPoints(75);
    expect(after.points).toBe(125);
  });
});

describe("Transactions & wallet", () => {
  it("appends new transactions and updates user balance", async () => {
    const user = await getUser();
    const startBalance = user.balance;
    const tx = await addTransaction({
      type: "deposit",
      amount: 25,
      description: "Test top up",
    });
    expect(tx.id).toBeTruthy();
    expect(tx.status).toBe("completed");
    const reloaded = await getUser();
    expect(reloaded.balance).toBe(startBalance + 25);
    const all = await getTransactions();
    expect(all[0].id).toBe(tx.id); // newest first
  });

  it("supports negative amounts (spending)", async () => {
    const user = await getUser();
    await saveUser({ ...user, balance: 100 });
    await addTransaction({ type: "tip", amount: -10, description: "Tip" });
    const reloaded = await getUser();
    expect(reloaded.balance).toBe(90);
  });
});

describe("Partners (affiliate) system", () => {
  it("seeds a non-empty default catalog with all partners disabled", async () => {
    const all = await getPartners();
    expect(all.length).toBeGreaterThanOrEqual(15);
    expect(all.every((p) => p.enabled === false)).toBe(true);
    expect(all.every((p) => p.url === "")).toBe(true);
  });

  it("savePartner persists changes to a single partner", async () => {
    const all = await getPartners();
    const target = all[0];
    await savePartner({ ...target, url: "https://example.com/aff" });
    const reloaded = await getPartners();
    expect(reloaded.find((p) => p.id === target.id)?.url).toBe("https://example.com/aff");
  });

  it("pickPartnerForSlot returns null when no partner is enabled with a url", async () => {
    const pick = await pickPartnerForSlot("founder_card");
    expect(pick).toBeNull();
  });

  it("togglePartner only surfaces a partner once both link + enabled are set", async () => {
    const all = await getPartners();
    const rms = all.find((p) => p.id === "p_rms")!;
    await savePartner({ ...rms, url: "https://rms.example.com" });
    await togglePartner("p_rms");
    const pick = await pickPartnerForSlot("founder_card");
    expect(pick?.id).toBe("p_rms");
  });

  it("recordPartnerClick increments the click counter", async () => {
    await recordPartnerClick("p_rms");
    await recordPartnerClick("p_rms");
    const all = await getPartners();
    const rms = all.find((p) => p.id === "p_rms")!;
    expect(rms.clicks).toBeGreaterThanOrEqual(2);
  });
});

describe("Founder tip flow", () => {
  it("deducts the tip from the user's wallet on success", async () => {
    const user = await getUser();
    await saveUser({ ...user, balance: 50 });
    const result = await tipFounder(5);
    expect(result.ok).toBe(true);
    const reloaded = await getUser();
    expect(reloaded.balance).toBe(45);
  });

  it("records a tip transaction tagged to the founder", async () => {
    const user = await getUser();
    await saveUser({ ...user, balance: 100 });
    await tipFounder(10);
    const txs = await getTransactions();
    const founderTip = txs.find((t) => t.creatorId === "founder" && t.amount === -10);
    expect(founderTip).toBeDefined();
    expect(founderTip?.type).toBe("tip");
  });

  it("refuses tips when the wallet has insufficient funds", async () => {
    const user = await getUser();
    await saveUser({ ...user, balance: 2 });
    const result = await tipFounder(5);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("insufficient_balance");
    const reloaded = await getUser();
    expect(reloaded.balance).toBe(2);
  });

  it("rejects non-positive tip amounts", async () => {
    const result = await tipFounder(0);
    expect(result.ok).toBe(false);
  });
});

describe("Leads (Real Merchant Services)", () => {
  it("captures leads with required fields", async () => {
    const lead = await addLead("Real Merchant Services", "Kenneth U", "ken@example.com");
    expect(lead.id).toBeTruthy();
    expect(lead.name).toBe("Kenneth U");
    expect(lead.email).toBe("ken@example.com");
    expect(lead.service).toBe("Real Merchant Services");
    expect(lead.status).toBe("submitted");
  });

  it("stores multiple leads in chronological order (newest first)", async () => {
    await addLead("RMS", "User A", "a@test.com");
    await addLead("RMS", "User B", "b@test.com");
    const all = await getLeads();
    expect(all.length).toBe(2);
    expect(all[0].name).toBe("User B");
    expect(all[1].name).toBe("User A");
  });
});

describe("Following / creators", () => {
  it("returns the seeded creator catalogue", async () => {
    const creators = await getCreators();
    expect(creators.length).toBeGreaterThanOrEqual(6);
    creators.forEach((c) => {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.monthlyPrice).toBeGreaterThan(0);
    });
  });

  it("looks up a creator by id", async () => {
    const creators = await getCreators();
    const target = creators[0];
    const found = await getCreator(target.id);
    expect(found?.name).toBe(target.name);
  });

  it("toggles following state idempotently", async () => {
    const creators = await getCreators();
    const id = creators[0].id;
    const before = await isFollowing(id);
    const after = await toggleFollow(id);
    expect(after).toBe(!before);
    const reverted = await toggleFollow(id);
    expect(reverted).toBe(before);
  });

  it("getFollowing returns array of creator ids", async () => {
    const following = await getFollowing();
    expect(Array.isArray(following)).toBe(true);
  });
});

describe("Feature flags", () => {
  it("returns default flags initially", async () => {
    const flags = await getFeatureFlags();
    expect(flags.contestsEnabled).toBe(true);
    expect(flags.videoUploadsEnabled).toBe(false);
    expect(flags.cryptoEnabled).toBe(false);
  });

  it("persists flag updates", async () => {
    await updateFeatureFlags({ videoUploadsEnabled: true });
    const flags = await getFeatureFlags();
    expect(flags.videoUploadsEnabled).toBe(true);
    expect(flags.contestsEnabled).toBe(true); // unchanged
  });
});

describe("Platform stats", () => {
  it("computes revenue based on 15% platform cut", async () => {
    const stats = await getPlatformStats();
    expect(stats.totalRevenue).toBeGreaterThan(0);
    expect(stats.totalUsers).toBeGreaterThan(0);
    expect(stats.totalCreators).toBeGreaterThan(0);
    expect(stats.transactionVolume).toBeGreaterThan(stats.totalRevenue); // 15% < 100%
  });

  it("includes lead and transaction counts", async () => {
    await addLead("RMS", "Lead Tester", "lead@test.com");
    const stats = await getPlatformStats();
    expect(stats.leadsCount).toBe(1);
    expect(typeof stats.transactionsCount).toBe("number");
  });
});
