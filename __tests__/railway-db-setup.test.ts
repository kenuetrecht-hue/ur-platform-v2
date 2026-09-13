import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("Railway MySQL table setup", () => {
  it("ships db:setup into the production image and runs it on start", () => {
    const dockerfile = readFileSync("Dockerfile", "utf8");
    const railway = readFileSync("railway.json", "utf8");
    const start = readFileSync("scripts/start-production.js", "utf8");
    const migrate = readFileSync("scripts/run-all-migrations.js", "utf8");
    expect(dockerfile).toContain("COPY --from=builder --chown=nodejs:nodejs /app/scripts ./scripts");
    expect(dockerfile).toContain("COPY --from=builder --chown=nodejs:nodejs /app/drizzle ./drizzle");
    expect(dockerfile).toContain('CMD ["node", "scripts/start-production.js"]');
    expect(railway).toContain("node scripts/run-all-migrations.js");
    expect(start).toContain("run-all-migrations.js");
    expect(migrate).toContain("drizzle-kit");
    expect(migrate).not.toContain("pnpm exec drizzle-kit");
  });
});
