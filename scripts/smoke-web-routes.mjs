#!/usr/bin/env node
/**
 * Smoke test key web routes return 200 (run while `pnpm dev:web` is active).
 */

const WEB_PORT = process.env.WEB_PORT ?? "8082";
const API_PORT = process.env.API_PORT ?? "3000";
const WEB_ORIGIN = `http://localhost:${WEB_PORT}`;
const API_ORIGIN = `http://localhost:${API_PORT}`;

const WEB_ROUTES = [
  "/",
  "/welcome",
  "/login",
  "/signup",
  "/age-verify",
  "/ais",
  "/shop",
  "/3d-workspace",
  "/playroom",
  "/jobsite",
  "/affiliate-dashboard",
  "/creator-dashboard",
];

const checks = [];

async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({ name, ok: false, message });
    console.error(`✗ ${name}: ${message}`);
  }
}

for (const route of WEB_ROUTES) {
  await check(`Web ${route}`, async () => {
    const res = await fetch(`${WEB_ORIGIN}${route}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (text.length < 100) throw new Error("unexpected short response");
  });
}

await check("API health + dev commerce mode", async () => {
  const res = await fetch(`${API_ORIGIN}/api/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  if (!body.ok) throw new Error("health ok=false");
  if (!body.commerce?.mode) throw new Error("missing commerce.mode");
});

const failed = checks.filter((c) => !c.ok);
console.log("");
if (failed.length) {
  console.error(`${failed.length} route check(s) failed. Start with: pnpm dev:web`);
  process.exit(1);
}

console.log(`All ${checks.length} route smoke checks passed.`);
console.log(`Browse: ${WEB_ORIGIN}/welcome`);
console.log(`AI Hub: ${WEB_ORIGIN}/ais`);
console.log(`Legal Masters: ${WEB_ORIGIN}/ais?group=legalMasters`);
