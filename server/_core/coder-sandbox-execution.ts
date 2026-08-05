/**
 * Enhanced sandbox build & test — structure validation without arbitrary code execution.
 */

import type { SandboxProject } from "./coder-sandbox-service";

export type ExecutionReport = {
  projectId: string;
  projectName: string;
  success: boolean;
  phase: "structure" | "dependencies" | "syntax" | "build_simulation";
  filesChecked: number;
  totalLines: number;
  estimatedBundleKb: number;
  entryPoints: string[];
  issues: string[];
  warnings: string[];
  testedAt: string;
};

function countLines(content: string): number {
  return content.split(/\r?\n/).length;
}

function checkBalanced(content: string, open: string, close: string): boolean {
  let depth = 0;
  for (const ch of content) {
    if (ch === open) depth += 1;
    if (ch === close) depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

function findEntryPoints(project: SandboxProject): string[] {
  const candidates = [
    "App.tsx",
    "App.jsx",
    "index.tsx",
    "index.ts",
    "index.js",
    "src/App.tsx",
    "src/index.tsx",
    "app/_layout.tsx",
  ];
  const paths = new Set(project.files.map((f) => f.path));
  return candidates.filter((c) => paths.has(c));
}

export function executeSandboxBuild(project: SandboxProject): ExecutionReport {
  const issues: string[] = [];
  const warnings: string[] = [];
  let totalLines = 0;
  let passed = 0;

  const entryPoints = findEntryPoints(project);
  if (entryPoints.length === 0) {
    warnings.push("No standard entry point found (App.tsx, index.tsx, etc.). Add one for a runnable app.");
  }

  const pkgFile = project.files.find((f) => f.path === "package.json" || f.path.endsWith("/package.json"));
  if (pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile.content) as Record<string, unknown>;
      if (!pkg.name) warnings.push("package.json: missing name field");
      if (!pkg.version) warnings.push("package.json: missing version field");
      passed += 1;
    } catch {
      issues.push("package.json: invalid JSON");
    }
  } else if (project.files.some((f) => ["tsx", "jsx", "typescript", "javascript"].includes(f.language))) {
    warnings.push("No package.json — recommended for full-stack sandbox apps.");
  }

  for (const file of project.files) {
    totalLines += countLines(file.content);

    if (file.language === "json") {
      try {
        JSON.parse(file.content);
        passed += 1;
      } catch {
        issues.push(`${file.path}: invalid JSON`);
      }
      continue;
    }

    if (["typescript", "tsx", "javascript", "jsx"].includes(file.language)) {
      if (!checkBalanced(file.content, "{", "}")) {
        issues.push(`${file.path}: mismatched curly braces`);
      } else if (!checkBalanced(file.content, "(", ")")) {
        issues.push(`${file.path}: mismatched parentheses`);
      } else if (!checkBalanced(file.content, "[", "]")) {
        issues.push(`${file.path}: mismatched brackets`);
      } else {
        passed += 1;
      }

      if (file.content.includes("eval(") || file.content.includes("Function(")) {
        warnings.push(`${file.path}: contains dynamic code execution — not allowed in sandbox runtime`);
      }
    } else {
      passed += 1;
    }
  }

  if (project.files.length === 0) {
    issues.push("No files in project — add source files before building.");
  }

  const totalBytes = project.files.reduce((sum, f) => sum + f.sizeBytes, 0);
  const estimatedBundleKb = Math.max(1, Math.round(totalBytes / 1024));

  return {
    projectId: project.id,
    projectName: project.name,
    success: issues.length === 0 && project.files.length > 0,
    phase: "build_simulation",
    filesChecked: project.files.length,
    totalLines,
    estimatedBundleKb,
    entryPoints,
    issues,
    warnings,
    testedAt: new Date().toISOString(),
  };
}

/** Alias for lightweight test — same engine, structure-only phase label. */
export function runSandboxStructureTest(project: SandboxProject): ExecutionReport {
  const report = executeSandboxBuild(project);
  return { ...report, phase: "syntax" };
}
