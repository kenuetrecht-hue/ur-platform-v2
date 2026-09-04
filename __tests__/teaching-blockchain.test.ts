import { describe, expect, it } from "vitest";
import {
  addTeachingBlock,
  createTeachingGenesis,
  isValidTeachingChain,
} from "../server/_core/teaching-blockchain";
import { CHAIN_SMITH_ID } from "../lib/forge-specialists";
import { isBlockchainTeachingCreator } from "../server/_core/blockchain-teaching-curriculum";

describe("teaching blockchain", () => {
  it("mines a valid genesis and linked block", () => {
    const genesis = createTeachingGenesis();
    const chain = addTeachingBlock([genesis], "first student block");
    expect(isValidTeachingChain(chain)).toBe(true);
    expect(chain[1]?.previousHash).toBe(genesis.hash);
    expect(chain[1]?.hash.startsWith("00")).toBe(true);
  });

  it("fails validation when a past block is changed", () => {
    const chain = addTeachingBlock([createTeachingGenesis()], "payment A");
    const tampered = chain.map((block, index) =>
      index === 0 ? { ...block, data: "tampered" } : block,
    );
    expect(isValidTeachingChain(tampered)).toBe(false);
  });

  it("belongs to ChainSmith", () => {
    expect(isBlockchainTeachingCreator(CHAIN_SMITH_ID)).toBe(true);
    expect(isBlockchainTeachingCreator("ai-crypto-001")).toBe(false);
  });
});
