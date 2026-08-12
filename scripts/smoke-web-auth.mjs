#!/usr/bin/env node
/**
 * Smoke test for web + API auth plumbing (pages load, CORS, health).
 * Run while `pnpm dev:web` is active.
 */

const WEB_PORT = process.env.WEB_PORT ?? "8082";
const API_PORT = process.env.API_PORT ?? "3000";
const WEB_ORIGIN = `http://localhost:${WEB_PORT}`;
const API_ORIGIN = `http://localhost:${API_PORT}`;

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

async function fetchText(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  return { res, text };
}

await check("API health", async () => {
  const { res, text } = await fetchText(`${API_ORIGIN}/api/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = JSON.parse(text);
  if (!body.ok) throw new Error("health ok=false");
});

await check("Web homepage loads", async () => {
  const { res, text } = await fetchText(`${WEB_ORIGIN}/welcome`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!text.includes("UR") && !text.includes("root")) {
    throw new Error("unexpected homepage HTML");
  }
});

await check("Login page loads", async () => {
  const { res, text } = await fetchText(`${WEB_ORIGIN}/login`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!text.toLowerCase().includes("sign") && !text.includes("root")) {
    throw new Error("login page HTML missing expected content");
  }
});

await check("CORS preflight (web → API)", async () => {
  const res = await fetch(`${API_ORIGIN}/api/trpc/system.health`, {
    method: "OPTIONS",
    headers: {
      Origin: WEB_ORIGIN,
      "Access-Control-Request-Method": "GET",
    },
  });
  const allowOrigin = res.headers.get("access-control-allow-origin");
  if (allowOrigin !== WEB_ORIGIN) {
    throw new Error(`expected Allow-Origin ${WEB_ORIGIN}, got ${allowOrigin ?? "none"}`);
  }
});

const failed = checks.filter((c) => !c.ok);
console.log("");
if (failed.length) {
  console.error(`${failed.length} check(s) failed. Is pnpm dev:web running?`);
  process.exit(1);
}

console.log("All web auth smoke checks passed.");
console.log(`Open ${WEB_ORIGIN}/login in your browser to sign in manually.`);
