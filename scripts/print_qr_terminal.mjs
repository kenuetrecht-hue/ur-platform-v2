#!/usr/bin/env node
import os from "os";
import QRCode from "qrcode";

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

const port = process.argv[2] ?? "8082";
const ip = process.argv[3] ?? getLanIp();
const url = process.argv[4] ?? `exp://${ip}:${port}`;

console.log("\nUR Platform — Expo Go\n");
console.log(`URL: ${url}\n`);
console.log("Scan with Expo Go (same Wi‑Fi as this laptop):\n");

const qr = await QRCode.toString(url, { type: "terminal", small: true });
console.log(qr);
console.log("\nTip: start Metro with  pnpm start:expo  or  pnpm exec expo start --port 8082\n");
