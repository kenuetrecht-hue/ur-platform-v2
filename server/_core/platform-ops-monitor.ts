/**
 * Background platform health monitor — detects issues, auto-isolates sections, alerts owner.
 */

import { runPlatformHealthScan } from "./platform-ops-service";

const MONITOR_INTERVAL_MS = 30 * 60 * 1000;
let monitorTimer: ReturnType<typeof setInterval> | null = null;
let lastScanAt = 0;

export function startPlatformOpsMonitor(): void {
  if (monitorTimer) return;

  void runInitialScan();

  monitorTimer = setInterval(() => {
    void runScheduledScan();
  }, MONITOR_INTERVAL_MS);
}

async function runInitialScan(): Promise<void> {
  try {
    await runPlatformHealthScan();
    lastScanAt = Date.now();
    console.log("[platform-ops] Initial health scan complete — owner alerted if issues found.");
  } catch (error) {
    console.warn("[platform-ops] Initial health scan failed:", error);
  }
}

async function runScheduledScan(): Promise<void> {
  if (Date.now() - lastScanAt < MONITOR_INTERVAL_MS - 5000) return;
  try {
    const result = await runPlatformHealthScan();
    lastScanAt = Date.now();
    if (result.incidentsCreated.length > 0) {
      console.log(
        `[platform-ops] Scheduled scan filed ${result.incidentsCreated.length} incident(s) — owner notified.`,
      );
    }
  } catch (error) {
    console.warn("[platform-ops] Scheduled health scan failed:", error);
  }
}

export function stopPlatformOpsMonitor(): void {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
}
