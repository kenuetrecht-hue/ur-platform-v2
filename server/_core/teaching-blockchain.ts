/**
 * Teaching blockchain — a real, runnable chain for ChainSmith lessons.
 * Educational only: not Bitcoin, not Ethereum, not a money network.
 */

import { createHash } from "node:crypto";

export type TeachingBlock = {
  index: number;
  timestamp: string;
  data: string;
  previousHash: string;
  nonce: number;
  hash: string;
};

export const TEACHING_CHAIN_DIFFICULTY = 2;

export function hashTeachingBlock(block: Omit<TeachingBlock, "hash">): string {
  return createHash("sha256")
    .update(
      `${block.index}|${block.timestamp}|${block.data}|${block.previousHash}|${block.nonce}`,
    )
    .digest("hex");
}

export function mineTeachingBlock(
  input: Omit<TeachingBlock, "hash" | "nonce">,
  difficulty = TEACHING_CHAIN_DIFFICULTY,
): TeachingBlock {
  const prefix = "0".repeat(difficulty);
  let nonce = 0;
  let hash = "";
  do {
    nonce += 1;
    hash = hashTeachingBlock({ ...input, nonce });
  } while (!hash.startsWith(prefix));
  return { ...input, nonce, hash };
}

export function createTeachingGenesis(data = "UR teaching genesis"): TeachingBlock {
  return mineTeachingBlock({
    index: 0,
    timestamp: "2026-01-01T00:00:00.000Z",
    data,
    previousHash: "0".repeat(64),
  });
}

export function addTeachingBlock(chain: TeachingBlock[], data: string): TeachingBlock[] {
  const previous = chain[chain.length - 1];
  if (!previous) return [createTeachingGenesis(data)];
  const next = mineTeachingBlock({
    index: previous.index + 1,
    timestamp: new Date().toISOString(),
    data,
    previousHash: previous.hash,
  });
  return [...chain, next];
}

export { TEACHING_CHAIN_STARTER_FILE } from "../../lib/teaching-blockchain-starter";

export function isValidTeachingChain(chain: TeachingBlock[]): boolean {
  if (chain.length === 0) return false;
  for (let i = 0; i < chain.length; i++) {
    const block = chain[i]!;
    const expected = hashTeachingBlock({
      index: block.index,
      timestamp: block.timestamp,
      data: block.data,
      previousHash: block.previousHash,
      nonce: block.nonce,
    });
    if (block.hash !== expected) return false;
    if (i === 0) {
      if (block.previousHash !== "0".repeat(64)) return false;
      continue;
    }
    const prev = chain[i - 1]!;
    if (block.previousHash !== prev.hash) return false;
    if (block.index !== prev.index + 1) return false;
  }
  return true;
}
