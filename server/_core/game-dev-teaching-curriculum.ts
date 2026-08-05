/**
 * GameForge — self-paced game development curriculum.
 */

import type { LearningLevel, LearningMode, LearningModule } from "./ai-learning-mode";
import { GAME_FORGE_CREATOR_ID, isGameForgeCreator } from "./game-dev-security";

export type GameExercise = {
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

const GAME_MODULES: Omit<LearningModule, "id">[] = [
  { title: "What makes a game fun", description: "Core loops, feedback, and player motivation." },
  { title: "Pick your engine", description: "Unity, Unreal, Godot — choose the right tool." },
  { title: "2D games from scratch", description: "Sprites, tilemaps, collision, 2D physics." },
  { title: "3D worlds & cameras", description: "Scenes, lighting, and player view." },
  { title: "Player movement & controls", description: "Input, controllers, game feel." },
  { title: "Combat & game mechanics", description: "Health, damage, abilities, balance." },
  { title: "AI for NPCs", description: "Pathfinding, behavior trees, state machines." },
  { title: "UI, menus & HUD", description: "Inventory, pause screens, accessibility." },
  { title: "Audio & music", description: "SFX, music layers, adaptive audio." },
  { title: "Multiplayer & networking", description: "Client-server, sync, latency." },
  { title: "Performance at scale", description: "LOD, pooling, profiling, open worlds." },
  { title: "Shaders & VFX", description: "Materials, particles, post-processing." },
  { title: "Level design", description: "Pacing, landmarks, playtesting." },
  { title: "Story & world building", description: "Narrative and lore design." },
  { title: "Asset pipeline", description: "Import, optimize, version control." },
  { title: "Publishing & platforms", description: "Steam, mobile, console (educational)." },
  { title: "Build a playable game solo", description: "Capstone vertical slice." },
  { title: "AAA-scale architecture", description: "ECS, streaming, massive game structure.", certificationPrep: true },
];

export function isGameTeachingCreator(creatorId: string): boolean {
  return isGameForgeCreator(creatorId);
}

export { GAME_FORGE_CREATOR_ID };

export function getGameTeachingModules(): LearningModule[] {
  return GAME_MODULES.map((item, index) => ({ id: `game-mod-${index + 1}`, ...item }));
}

export const GAME_SELF_PACED_PATH: Record<LearningLevel, SelfPacedStep[]> = {
  beginner: [
    { order: 1, title: "Game design basics", description: "What is fun?", estimatedMinutes: 20, moduleTitle: "What makes a game fun" },
    { order: 2, title: "Choose an engine", description: "Install and explore.", estimatedMinutes: 30, moduleTitle: "Pick your engine" },
    { order: 3, title: "Move a character", description: "First playable.", estimatedMinutes: 45, moduleTitle: "Player movement & controls" },
    { order: 4, title: "Collision & goals", description: "Pickups and win state.", estimatedMinutes: 40, moduleTitle: "2D games from scratch" },
    { order: 5, title: "Ship a mini-game", description: "Vertical slice.", estimatedMinutes: 90, moduleTitle: "Build a playable game solo" },
  ],
  intermediate: [
    { order: 1, title: "3D scene setup", description: "Camera and lighting.", estimatedMinutes: 50, moduleTitle: "3D worlds & cameras" },
    { order: 2, title: "Enemy AI", description: "Patrol and chase.", estimatedMinutes: 60, moduleTitle: "AI for NPCs" },
    { order: 3, title: "UI polish", description: "Menus and HUD.", estimatedMinutes: 45, moduleTitle: "UI, menus & HUD" },
    { order: 4, title: "Optimize FPS", description: "Profile and fix.", estimatedMinutes: 40, moduleTitle: "Performance at scale" },
  ],
  advanced: [
    { order: 1, title: "Multiplayer prototype", description: "Sync two players.", estimatedMinutes: 90, moduleTitle: "Multiplayer & networking" },
    { order: 2, title: "Open world streaming", description: "Large maps.", estimatedMinutes: 75, moduleTitle: "Performance at scale" },
    { order: 3, title: "Massive game architecture", description: "ECS and pipelines.", estimatedMinutes: 60, moduleTitle: "AAA-scale architecture" },
    { order: 4, title: "AAA capstone plan", description: "Design a massive game.", estimatedMinutes: 120, moduleTitle: "Build a playable game solo" },
  ],
};

const GAME_EXERCISES: GameExercise[] = [
  {
    id: "g-ex-move",
    title: "Move the player",
    level: "beginner",
    topic: "Player movement & controls",
    prompt: "Teach me 2D player movement. I'll code it myself — hints only.",
    starterFile: {
      path: "scripts/Player.gd",
      content: "extends CharacterBody2D\n\nfunc _physics_process(delta):\n\tpass\n",
    },
  },
  {
    id: "g-ex-npc",
    title: "Enemy AI",
    level: "intermediate",
    topic: "AI for NPCs",
    prompt: "Guide me through patrol-chase AI. I'll implement it solo.",
    starterFile: {
      path: "scripts/EnemyAI.cs",
      content: "using UnityEngine;\n\npublic class EnemyAI : MonoBehaviour {\n}\n",
    },
  },
  {
    id: "g-ex-massive",
    title: "Massive game plan",
    level: "advanced",
    topic: "AAA-scale architecture",
    prompt: "Help me plan a massive open-world game architecture and milestones.",
    starterFile: {
      path: "docs/GAME_DESIGN.md",
      content: "# Game Design Document\n\n## Core loop\n\n## World scale\n",
    },
  },
];

export function getGameSelfPacedPath(level: LearningLevel) {
  return GAME_SELF_PACED_PATH[level];
}

export function getGamePracticeExercises(params: { level?: LearningLevel; count?: number }) {
  const count = params.count ?? 5;
  let list = GAME_EXERCISES;
  if (params.level) list = list.filter((e) => e.level === params.level);
  return list.slice(0, count);
}

export function buildGameTeachingPromptAddition(level: LearningLevel, mode: LearningMode, topic?: string): string {
  const path = GAME_SELF_PACED_PATH[level];
  return `
GAMEFORGE — VIDEO GAME DEVELOPMENT INSTRUCTOR
Teach learners to build games on their own: Unity, Unreal, Godot, 2D/3D, multiplayer, massive worlds.
Never generate cheats, DRM bypass, malware, or tampering tools.
Level: ${level} | Mode: ${mode} | Topic: ${topic ?? path[0]?.moduleTitle}
Path: ${path.map((s) => s.title).join(" → ")}
Use Build sandbox for scripts and design docs.`.trim();
}
