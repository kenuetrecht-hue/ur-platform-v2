/** Starter file for ChainSmith Build — no Node APIs (safe for the app bundle). */
export const TEACHING_CHAIN_STARTER_FILE = {
  path: "chain.ts",
  content: `/**
 * Teaching blockchain — run in the Build sandbox.
 * 1 block links to the last with a hash. Mine until the hash starts with 00.
 */

export type Block = {
  index: number;
  timestamp: string;
  data: string;
  previousHash: string;
  nonce: number;
  hash: string;
};

function sha256(value: string): string {
  // Teaching hash for the sandbox. ChainSmith's server lab uses real SHA-256.
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).padStart(64, "0");
}

function hashBlock(block: Omit<Block, "hash">): string {
  return sha256(\`\${block.index}|\${block.timestamp}|\${block.data}|\${block.previousHash}|\${block.nonce}\`);
}

export function mineBlock(input: Omit<Block, "hash" | "nonce">, difficulty = 2): Block {
  const prefix = "0".repeat(difficulty);
  let nonce = 0;
  let hash = "";
  do {
    nonce += 1;
    hash = hashBlock({ ...input, nonce });
  } while (!hash.startsWith(prefix));
  return { ...input, nonce, hash };
}

export function createGenesis(): Block {
  return mineBlock({
    index: 0,
    timestamp: "2026-01-01T00:00:00.000Z",
    data: "UR teaching genesis",
    previousHash: "0".repeat(64),
  });
}
`,
};
