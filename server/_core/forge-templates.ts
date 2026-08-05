/**
 * Project scaffolds for TechBuilder & GameForge sandboxes.
 */

export type ForgeTemplateId =
  | "expo-app"
  | "expo-mobile-game"
  | "next-trpc"
  | "godot-2d"
  | "unity-2d"
  | "html5-game"
  | "multiplayer-starter";

export type ForgeTemplate = {
  id: ForgeTemplateId;
  label: string;
  description: string;
  specialist: "coder" | "game" | "both";
  engine?: string;
  framework?: string;
  files: Array<{ path: string; content: string }>;
};

const EXPO_APP: ForgeTemplate = {
  id: "expo-app",
  label: "Expo / React Native",
  description: "Mobile app starter with tabs and TypeScript.",
  specialist: "coder",
  framework: "React Native / Expo",
  files: [
    {
      path: "App.tsx",
      content: `import { View, Text, StyleSheet } from "react-native";

export default function App() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>My App</Text>
      <Text style={styles.sub}>Built with TechBuilder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "700" },
  sub: { marginTop: 8, fontSize: 14, opacity: 0.7 },
});
`,
    },
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: "techbuilder-app",
          version: "1.0.0",
          main: "App.tsx",
          private: true,
          scripts: { start: "expo start", test: "echo ok" },
          dependencies: { expo: "~54.0.0", react: "19.1.0", "react-native": "0.81.0" },
        },
        null,
        2,
      ),
    },
    {
      path: ".github/workflows/ci.yml",
      content: `name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci || npm install
      - run: npm test
`,
    },
  ],
};

const NEXT_TRPC: ForgeTemplate = {
  id: "next-trpc",
  label: "Next.js + tRPC",
  description: "Full-stack web app scaffold like UR Platform.",
  specialist: "coder",
  framework: "Next.js / tRPC",
  files: [
    {
      path: "src/app/page.tsx",
      content: `export default function Home() {
  return (
    <main style={{ padding: 32 }}>
      <h1>My App</h1>
      <p>Next.js + tRPC starter from TechBuilder.</p>
    </main>
  );
}
`,
    },
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: "techbuilder-web",
          version: "1.0.0",
          private: true,
          scripts: { dev: "next dev", build: "next build", test: "echo ok" },
          dependencies: { next: "15", react: "19", "@trpc/server": "11" },
        },
        null,
        2,
      ),
    },
    {
      path: ".github/workflows/ci.yml",
      content: `name: Web CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm install
      - run: npm run build
`,
    },
  ],
};

const GODOT_2D: ForgeTemplate = {
  id: "godot-2d",
  label: "Godot 4 — 2D platformer",
  description: "Player movement, gravity, and collectible.",
  specialist: "game",
  engine: "Godot 4",
  files: [
    {
      path: "project.godot",
      content: `; GameForge Godot starter
config_version=5

[application]
config/name="My Game"
run/main_scene="res://scenes/Main.tscn"
`,
    },
    {
      path: "scripts/Player.gd",
      content: `extends CharacterBody2D

const SPEED = 220.0
const JUMP = -420.0
var gravity = ProjectSettings.get_setting("physics/2d/default_gravity")

func _physics_process(delta):
\tvelocity.y += gravity * delta
\tif Input.is_action_just_pressed("ui_accept") and is_on_floor():
\t\tvelocity.y = JUMP
\tvar dir = Input.get_axis("ui_left", "ui_right")
\tvelocity.x = dir * SPEED
\tmove_and_slide()
`,
    },
    {
      path: "scenes/Main.tscn",
      content: `[gd_scene load_steps=2 format=3]

[node name="Main" type="Node2D"]
`,
    },
    {
      path: "docs/GAME_DESIGN.md",
      content: `# Game Design Document\n\n## Core loop\nMove → collect → win\n\n## Milestones\n1. Player movement\n2. Level 1\n3. Polish\n`,
    },
  ],
};

const UNITY_2D: ForgeTemplate = {
  id: "unity-2d",
  label: "Unity — 2D controller",
  description: "C# player controller and game manager.",
  specialist: "game",
  engine: "Unity",
  files: [
    {
      path: "Assets/Scripts/PlayerController.cs",
      content: `using UnityEngine;

public class PlayerController : MonoBehaviour {
    public float speed = 5f;
    private Rigidbody2D rb;

    void Awake() => rb = GetComponent<Rigidbody2D>();

    void Update() {
        float h = Input.GetAxisRaw("Horizontal");
        rb.velocity = new Vector2(h * speed, rb.velocity.y);
    }
}
`,
    },
    {
      path: "Assets/Scripts/GameManager.cs",
      content: `using UnityEngine;

public class GameManager : MonoBehaviour {
    public int score;
    public void AddScore(int amount) => score += amount;
}
`,
    },
  ],
};

const HTML5_GAME: ForgeTemplate = {
  id: "html5-game",
  label: "HTML5 canvas game",
  description: "Playable in live preview — no engine install needed.",
  specialist: "game",
  engine: "HTML5",
  files: [
    {
      path: "index.html",
      content: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>My Game</title>
<style>body{margin:0;background:#111;display:flex;justify-content:center;align-items:center;height:100vh}
canvas{background:#222;border:2px solid #444}</style></head>
<body><canvas id="c" width="480" height="320"></canvas>
<script src="game.js"></script></body></html>`,
    },
    {
      path: "game.js",
      content: `const c = document.getElementById("c");
const ctx = c.getContext("2d");
let x = 40, y = 260, vy = 0, score = 0;
const keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);
function loop() {
  vy += 0.6; y += vy;
  if (keys["ArrowLeft"]) x -= 4;
  if (keys["ArrowRight"]) x += 4;
  if (keys[" "] && y >= 260) { vy = -11; y = 260; }
  if (y > 260) { y = 260; vy = 0; }
  ctx.fillStyle = "#222"; ctx.fillRect(0, 0, 480, 320);
  ctx.fillStyle = "#6cf"; ctx.fillRect(x, y, 24, 24);
  ctx.fillStyle = "#fc6"; ctx.fillRect(400, 280, 16, 16);
  if (Math.abs(x - 400) < 20 && Math.abs(y - 280) < 20) score++;
  ctx.fillStyle = "#fff"; ctx.fillText("Score: " + score, 12, 24);
  requestAnimationFrame(loop);
}
loop();
`,
    },
  ],
};

const MULTIPLAYER_STARTER: ForgeTemplate = {
  id: "multiplayer-starter",
  label: "Multiplayer architecture",
  description: "Client-server sync design doc + server stub.",
  specialist: "game",
  engine: "Multiplayer",
  files: [
    {
      path: "docs/MULTIPLAYER.md",
      content: `# Multiplayer Architecture\n\n## Model\nAuthoritative server, client prediction\n\n## Sync\n- Player position @ 20Hz\n- State snapshots @ 5Hz\n\n## Security\n- Server validates all actions\n- Rate limit inputs\n`,
    },
    {
      path: "server/game-server.ts",
      content: `/** Educational multiplayer stub — deploy separately */
export type PlayerState = { id: string; x: number; y: number };
const players = new Map<string, PlayerState>();

export function join(id: string) {
  players.set(id, { id, x: 0, y: 0 });
}

export function move(id: string, x: number, y: number) {
  const p = players.get(id);
  if (p) { p.x = x; p.y = y; }
}

export function snapshot() {
  return [...players.values()];
}
`,
    },
  ],
};

const EXPO_MOBILE_GAME: ForgeTemplate = {
  id: "expo-mobile-game",
  label: "Simple mobile game (iOS & Android)",
  description: "Tap-to-play Expo game — ship to App Store & Google Play with EAS.",
  specialist: "game",
  engine: "Expo / React Native",
  files: [
    {
      path: "App.tsx",
      content: `import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");
const GROUND = 280;
const GRAVITY = 0.55;

export default function App() {
  const [x, setX] = useState(width / 2 - 16);
  const [y, setY] = useState(GROUND);
  const [vy, setVy] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const targetX = useRef(width - 80);
  const frame = useRef<number | null>(null);

  const jump = useCallback(() => {
    setVy((v) => (y >= GROUND - 1 ? -12 : v));
  }, [y]);

  useEffect(() => {
    const tick = () => {
      setVy((v) => v + GRAVITY);
      setY((prev) => {
        let next = prev + vy;
        if (next >= GROUND) {
          next = GROUND;
          setVy(0);
        }
        return next;
      });
      setX((prev) => Math.max(8, Math.min(width - 40, prev)));
      targetX.current = 60 + ((Date.now() / 40) % (width - 120));
      setScore((s) => {
        const hit = Math.abs(x - targetX.current) < 28 && Math.abs(y - GROUND) < 8;
        const next = hit ? s + 1 : s;
        if (hit) setBest((b) => Math.max(b, next));
        return next;
      });
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, [vy, x, y]);

  return (
    <Pressable style={styles.root} onPress={jump}>
      <Text style={styles.title}>Tap to jump!</Text>
      <Text style={styles.score}>Score {score} · Best {best}</Text>
      <View style={styles.stage}>
        <View style={[styles.player, { left: x, top: y }]} />
        <View style={[styles.target, { left: targetX.current }]} />
      </View>
      <Text style={styles.hint}>Ship to Apple & Google from GameForge → Build → Mobile stores</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f172a", paddingTop: 56, paddingHorizontal: 16 },
  title: { color: "#f8fafc", fontSize: 22, fontWeight: "800", textAlign: "center" },
  score: { color: "#94a3b8", fontSize: 14, textAlign: "center", marginTop: 8 },
  stage: { flex: 1, marginTop: 24, position: "relative" },
  player: { position: "absolute", width: 32, height: 32, borderRadius: 8, backgroundColor: "#38bdf8" },
  target: { position: "absolute", top: GROUND + 4, width: 20, height: 20, borderRadius: 10, backgroundColor: "#fbbf24" },
  hint: { color: "#64748b", fontSize: 11, textAlign: "center", marginBottom: 24 },
});
`,
    },
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: "gameforge-mobile-game",
          version: "1.0.0",
          main: "App.tsx",
          private: true,
          scripts: {
            start: "expo start",
            android: "expo run:android",
            ios: "expo run:ios",
            test: "echo ok",
          },
          dependencies: {
            expo: "~54.0.0",
            react: "19.1.0",
            "react-native": "0.81.0",
          },
        },
        null,
        2,
      ),
    },
    {
      path: "app.json",
      content: JSON.stringify(
        {
          expo: {
            name: "My Game",
            slug: "my-game",
            version: "1.0.0",
            orientation: "portrait",
            icon: "./assets/icon.png",
            splash: { image: "./assets/splash.png", resizeMode: "contain", backgroundColor: "#0f172a" },
            ios: { supportsTablet: true, bundleIdentifier: "com.urplatform.mygame" },
            android: {
              package: "com.urplatform.mygame",
              adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#0f172a" },
            },
            platforms: ["ios", "android"],
          },
        },
        null,
        2,
      ),
    },
    {
      path: "docs/GAME_DESIGN.md",
      content: `# ${"My Game"}\n\n## Core loop\nTap to jump · collect targets · beat high score\n\n## Mobile stores\nUse Build → **Apple App Store** or **Google Play** to generate EAS configs.\n`,
    },
    {
      path: "assets/README.md",
      content: "# Add icon.png (1024×1024) and splash.png before store submit.",
    },
  ],
};

export const FORGE_TEMPLATES: Record<ForgeTemplateId, ForgeTemplate> = {
  "expo-app": EXPO_APP,
  "expo-mobile-game": EXPO_MOBILE_GAME,
  "next-trpc": NEXT_TRPC,
  "godot-2d": GODOT_2D,
  "unity-2d": UNITY_2D,
  "html5-game": HTML5_GAME,
  "multiplayer-starter": MULTIPLAYER_STARTER,
};

export function listForgeTemplates(specialist: "coder" | "game") {
  return Object.values(FORGE_TEMPLATES).filter(
    (t) => t.specialist === specialist || t.specialist === "both",
  );
}
