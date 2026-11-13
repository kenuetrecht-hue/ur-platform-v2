/**
 * Defensive read of our own source. A hit means a planted door.
 * A clear scan does not raise the red banner.
 */

export type TamperHit = {
  path: string;
  line: number;
  reason: string;
};

export type TamperScanFile = {
  path: string;
  text: string;
};

function isComment(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");
}

function isDetectorLine(line: string): boolean {
  return (
    line.includes('includes("eval(') ||
    line.includes("includes('eval(") ||
    line.includes('includes("Function(') ||
    line.includes("includes('Function(")
  );
}

export function scanSourceForTamper(files: TamperScanFile[]): TamperHit[] {
  const hits: TamperHit[] = [];
  for (const file of files) {
    const normalized = file.path.replace(/\\/g, "/");
    if (normalized.includes("owner-tamper-scan")) continue;
    const lines = file.text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      if (isComment(line) || isDetectorLine(line)) continue;
      const lineNo = index + 1;
      if (/\beval\s*\(/.test(line)) {
        hits.push({ path: normalized, line: lineNo, reason: "This line runs text as a program." });
      }
      if (/\bnew\s+Function\s*\(/.test(line)) {
        hits.push({ path: normalized, line: lineNo, reason: "This line builds a program from text." });
      }
      if (
        normalized.endsWith("platform-ops-router.ts") &&
        /publicProcedure\s*\.\s*mutation/.test(line)
      ) {
        hits.push({
          path: normalized,
          line: lineNo,
          reason: "An owner action is open without a sign-in check.",
        });
      }
      if (
        /\/routers\//.test(normalized) &&
        /\b(exec|execSync|spawn)\s*\(/.test(line)
      ) {
        hits.push({
          path: normalized,
          line: lineNo,
          reason: "A website route starts a system command.",
        });
      }
    }
  }
  return hits;
}
