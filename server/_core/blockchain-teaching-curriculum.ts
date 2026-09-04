/**
 * ChainSmith — self-paced blockchain teaching curriculum.
 */

import type { LearningLevel, LearningMode, LearningModule } from "./ai-learning-mode";
import { TEACHING_CHAIN_STARTER_FILE } from "./teaching-blockchain";

export const CHAIN_SMITH_ID = "ai-blockchain-001";

export type BlockchainExercise = {
  id: string;
  title: string;
  level: LearningLevel;
  topic: string;
  prompt: string;
  starterFile?: { path: string; content: string };
};

export type SelfPacedStep = {
  order: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  moduleTitle: string;
};

const BLOCKCHAIN_MODULES: Omit<LearningModule, "id">[] = [
  { title: "What a blockchain is", description: "Ledgers, blocks, and why order matters." },
  { title: "Hashes and fingerprints", description: "SHA-256, tamper evidence, and changing one byte." },
  { title: "Build your first block", description: "Index, timestamp, data, previous hash." },
  { title: "Link blocks into a chain", description: "Genesis, next block, and validation." },
  { title: "Proof of work (teaching)", description: "Nonces, difficulty, and mining a hash prefix." },
  { title: "Wallets and keys (concepts)", description: "Public/private keys — never spend real money in class." },
  { title: "Simple transactions", description: "From, to, amount, and signing ideas." },
  { title: "Consensus in plain English", description: "Proof of work vs proof of stake — teaching models only." },
  { title: "Smart-contract labs", description: "Solidity-style examples you can read and edit." },
  { title: "Nodes and networks", description: "What a node stores, gossip, and forks." },
  { title: "Read real chain code", description: "Walk a small implementation line by line." },
  { title: "Build a teaching chain solo", description: "Capstone: mine, validate, and add a transaction.", certificationPrep: true },
];

export function isBlockchainTeachingCreator(creatorId: string): boolean {
  return creatorId === CHAIN_SMITH_ID;
}

export function getBlockchainTeachingModules(): LearningModule[] {
  return BLOCKCHAIN_MODULES.map((item, index) => ({
    id: `chain-mod-${index + 1}`,
    ...item,
  }));
}

export const BLOCKCHAIN_SELF_PACED_PATH: Record<LearningLevel, SelfPacedStep[]> = {
  beginner: [
    { order: 1, title: "See a ledger", description: "What a chain records.", estimatedMinutes: 15, moduleTitle: "What a blockchain is" },
    { order: 2, title: "Hash one string", description: "Change a letter, watch the hash change.", estimatedMinutes: 20, moduleTitle: "Hashes and fingerprints" },
    { order: 3, title: "Make a block", description: "Fill the fields by hand.", estimatedMinutes: 25, moduleTitle: "Build your first block" },
    { order: 4, title: "Link two blocks", description: "Genesis then one more.", estimatedMinutes: 30, moduleTitle: "Link blocks into a chain" },
    { order: 5, title: "Mine a teaching block", description: "Nonce until the prefix matches.", estimatedMinutes: 40, moduleTitle: "Proof of work (teaching)" },
  ],
  intermediate: [
    { order: 1, title: "Validate a chain", description: "Catch a tampered block.", estimatedMinutes: 35, moduleTitle: "Link blocks into a chain" },
    { order: 2, title: "Add a transaction", description: "From / to / amount.", estimatedMinutes: 40, moduleTitle: "Simple transactions" },
    { order: 3, title: "Read a contract", description: "Walk a Solidity-style example.", estimatedMinutes: 45, moduleTitle: "Smart-contract labs" },
    { order: 4, title: "Explain consensus", description: "PoW vs PoS in your own words.", estimatedMinutes: 30, moduleTitle: "Consensus in plain English" },
  ],
  advanced: [
    { order: 1, title: "Write the miner", description: "Difficulty and hash loop.", estimatedMinutes: 50, moduleTitle: "Proof of work (teaching)" },
    { order: 2, title: "Forks and nodes", description: "What happens when two chains compete.", estimatedMinutes: 45, moduleTitle: "Nodes and networks" },
    { order: 3, title: "Capstone teaching chain", description: "Mine, validate, transact.", estimatedMinutes: 90, moduleTitle: "Build a teaching chain solo" },
    { order: 4, title: "Read production-style code", description: "Compare your chain to a small real implementation.", estimatedMinutes: 60, moduleTitle: "Read real chain code" },
  ],
};

const BLOCKCHAIN_EXERCISES: BlockchainExercise[] = [
  {
    id: "b-ex-hash",
    title: "Hash a string",
    level: "beginner",
    topic: "Hashes and fingerprints",
    prompt: "Hash the word hello, then change one letter and hash again. Tell me what changed.",
  },
  {
    id: "b-ex-block",
    title: "Build a block",
    level: "beginner",
    topic: "Build your first block",
    prompt: "I'll type a block with index, data, and previous hash. Check my fields.",
    starterFile: TEACHING_CHAIN_STARTER_FILE,
  },
  {
    id: "b-ex-mine",
    title: "Mine a teaching block",
    level: "intermediate",
    topic: "Proof of work (teaching)",
    prompt: "Guide me to mine until the hash starts with 00. I'll write the loop.",
    starterFile: TEACHING_CHAIN_STARTER_FILE,
  },
  {
    id: "b-ex-validate",
    title: "Catch a tampered chain",
    level: "intermediate",
    topic: "Link blocks into a chain",
    prompt: "I changed a past block's data. Help me write isValidChain so it fails.",
  },
  {
    id: "b-ex-capstone",
    title: "Teaching-chain capstone",
    level: "advanced",
    topic: "Build a teaching chain solo",
    prompt: "Help me plan a local teaching chain: genesis, mine, transact, validate. I'll code it.",
    starterFile: TEACHING_CHAIN_STARTER_FILE,
  },
];

export function getBlockchainSelfPacedPath(level: LearningLevel) {
  return BLOCKCHAIN_SELF_PACED_PATH[level];
}

export function getBlockchainPracticeExercises(params: { level?: LearningLevel; count?: number }) {
  const count = params.count ?? 5;
  let list = BLOCKCHAIN_EXERCISES;
  if (params.level) list = list.filter((e) => e.level === params.level);
  return list.slice(0, count);
}

export function buildBlockchainTeachingPromptAddition(
  level: LearningLevel,
  mode: LearningMode,
  topic?: string,
): string {
  const path = BLOCKCHAIN_SELF_PACED_PATH[level];
  return `
CHAINSMITH — BLOCKCHAIN TEACHER AND BUILDER
Teach learners to understand and code blockchains: hashes, blocks, mining, validation, wallets (concepts), and Solidity-style contracts.
Write complete, runnable teaching code when they ask to build. Label it as a teaching chain — not Bitcoin or Ethereum mainnet.
Never give investment advice, guaranteed returns, rug-pull help, mixers, key theft, or exploit kits.
Redirect price and portfolio talk to AI Crypto Analyst.
Level: ${level} | Mode: ${mode} | Topic: ${topic ?? path[0]?.moduleTitle}
Path: ${path.map((s) => s.title).join(" → ")}
Use the Build sandbox for chain.ts and contract labs.`.trim();
}
