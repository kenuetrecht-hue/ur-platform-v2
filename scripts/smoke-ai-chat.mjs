/**
 * Smoke test — verifies Gemini chat works with server .env
 * Run: node scripts/smoke-ai-chat.mjs
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });

const key = process.env.CONTENTMATE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!key) {
  console.error("FAIL: No CONTENTMATE_GEMINI_API_KEY in .env");
  console.error("Get a key at https://aistudio.google.com/apikey");
  process.exit(1);
}

const models = [
  process.env.GOOGLE_GEMINI_MODEL,
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
].filter(Boolean);

const { GoogleGenerativeAI } = await import("@google/generative-ai");
const genAI = new GoogleGenerativeAI(key);

let success = false;
for (const modelName of models) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(
      'Reply with exactly: "UR Platform AI is online."',
    );
    const text = result.response.text()?.trim();
    if (text) {
      console.log(`OK model=${modelName}`);
      console.log(`Reply: ${text.slice(0, 200)}`);
      success = true;
      break;
    }
  } catch (err) {
    const msg = err.message?.slice(0, 220) ?? String(err);
    console.error(`FAIL model=${modelName}: ${msg}`);
    if (/429|quota|rate.limit/i.test(msg)) {
      console.error("");
      console.error("Quota exhausted on this API key. Options:");
      console.error("  1. Wait 2+ minutes (per-minute limit) or until tomorrow (daily limit)");
      console.error("  2. Check usage: https://ai.dev/rate-limit");
      console.error("  3. New key in a fresh project: https://aistudio.google.com/apikey");
      console.error("  4. Enable billing on the Google Cloud project for higher limits");
      break;
    }
    if (/401|403|invalid authentication/i.test(msg)) {
      console.error("");
      console.error("Fix: https://aistudio.google.com/apikey → Create API key → paste into .env:");
      console.error('  CONTENTMATE_GEMINI_API_KEY="your-key-here"');
      console.error("Then: node scripts/free-dev-ports.mjs && pnpm dev");
    }
  }
}

process.exit(success ? 0 : 1);
