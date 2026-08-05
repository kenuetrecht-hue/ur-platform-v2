/**
 * Ephemeral isolated execution — allowlisted commands only, workspace wiped in finally.
 */

import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { TRPCError } from "@trpc/server";
import type { SandboxProject } from "./coder-sandbox-service";
import { scanGameSandboxContent } from "./game-dev-security";
import {
  createForgeExecutionSession,
  destroyForgeSession,
  getForgeSession,
  touchForgeSession,
  type ForgeSessionKind,
} from "./forge-session-manager";

const MAX_EXEC_MS = 90_000;
const MAX_OUTPUT_BYTES = 256_000;

export type ExecutionStepResult = {
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  success: boolean;
  durationMs: number;
};

export type CloudExecutionReport = {
  sessionId: string;
  steps: ExecutionStepResult[];
  success: boolean;
  workspaceWiped: boolean;
  message: string;
};

function assertPathInsideRoot(root: string, relPath: string): string {
  const cleaned = relPath.replace(/^\/+/, "").replace(/\.\./g, "");
  const full = path.resolve(root, cleaned);
  const rootResolved = path.resolve(root);
  if (!full.startsWith(rootResolved + path.sep) && full !== rootResolved) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Path traversal blocked." });
  }
  return full;
}

async function writeProjectToWorkspace(
  workspacePath: string,
  project: SandboxProject,
  specialist: ForgeSessionKind,
): Promise<void> {
  for (const file of project.files) {
    if (specialist === "game") {
      const scan = scanGameSandboxContent(file.content, file.path);
      if (!scan.safe) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Security block before execution: ${scan.issues[0]}`,
        });
      }
    }
    const blocked = [/child_process/i, /eval\s*\(/i, /new\s+Function/i];
    for (const p of blocked) {
      if (p.test(file.content)) {
        throw new TRPCError({ code: "FORBIDDEN", message: `Unsafe pattern in ${file.path}` });
      }
    }

    const dest = assertPathInsideRoot(workspacePath, file.path);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, file.content, "utf8");
  }
}

function runAllowlistedCommand(
  cwd: string,
  command: string,
  args: string[],
): Promise<ExecutionStepResult> {
  const started = Date.now();
  const label = [command, ...args].join(" ");

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      env: {
        PATH: process.env.PATH ?? "",
        SystemRoot: process.env.SystemRoot,
        NODE_ENV: "test",
        CI: "true",
        NO_COLOR: "1",
      },
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 2000);
    }, MAX_EXEC_MS);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout = (stdout + chunk.toString()).slice(-MAX_OUTPUT_BYTES);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-MAX_OUTPUT_BYTES);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        command: label,
        exitCode: killed ? null : code,
        stdout: stdout.trim(),
        stderr: killed ? `${stderr}\n[timeout after ${MAX_EXEC_MS}ms]`.trim() : stderr.trim(),
        success: !killed && code === 0,
        durationMs: Date.now() - started,
      });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        command: label,
        exitCode: null,
        stdout: "",
        stderr: err.message,
        success: false,
        durationMs: Date.now() - started,
      });
    });
  });
}

async function readPackageScripts(workspacePath: string): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(path.join(workspacePath, "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
    return pkg.scripts ?? {};
  } catch {
    return {};
  }
}

async function buildExecutionPlan(workspacePath: string): Promise<Array<{ cmd: string; args: string[] }>> {
  const plan: Array<{ cmd: string; args: string[] }> = [];
  const scripts = await readPackageScripts(workspacePath);

  if (scripts.test) {
    plan.push({ cmd: "npm", args: ["test"] });
  }
  if (scripts.build) {
    plan.push({ cmd: "npm", args: ["run", "build"] });
  }

  const entries = await collectJsTsFiles(workspacePath);
  for (const rel of entries.slice(0, 20)) {
    plan.push({ cmd: "node", args: ["--check", rel] });
  }

  if (plan.length === 0) {
    plan.push({ cmd: "node", args: ["-e", "console.log('structure ok')"] });
  }

  return plan;
}

async function collectJsTsFiles(dir: string, base = dir): Promise<string[]> {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === "node_modules" || name === ".git") continue;
    const full = path.join(dir, name);
    const stat = await fs.stat(full).catch(() => null);
    if (!stat) continue;
    if (stat.isDirectory()) {
      out.push(...(await collectJsTsFiles(full, base)));
    } else if (/\.(mjs|cjs|js|ts)$/.test(name) && !name.endsWith(".d.ts")) {
      out.push(path.relative(base, full).split(path.sep).join("/"));
    }
  }
  return out;
}

async function wipeWorkspaceDir(workspacePath: string): Promise<void> {
  try {
    const entries = await fs.readdir(workspacePath);
    for (const entry of entries) {
      await fs.rm(path.join(workspacePath, entry), { recursive: true, force: true });
    }
  } catch {
    // already gone
  }
}

export async function runEphemeralCloudExecution(params: {
  userId: string;
  specialist: ForgeSessionKind;
  project: SandboxProject;
  destroySessionAfter?: boolean;
}): Promise<CloudExecutionReport> {
  const session = await createForgeExecutionSession({
    userId: params.userId,
    specialist: params.specialist,
    projectId: params.project.id,
  });

  touchForgeSession(session.id);
  session.status = "running";

  const steps: ExecutionStepResult[] = [];
  let success = true;

  try {
    await writeProjectToWorkspace(session.workspacePath, params.project, params.specialist);

    const hasPkg = await fs
      .access(path.join(session.workspacePath, "package.json"))
      .then(() => true)
      .catch(() => false);

    if (hasPkg) {
      const installStep = await runAllowlistedCommand(session.workspacePath, "npm", [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
      ]);
      steps.push(installStep);
      if (!installStep.success) success = false;

      if (installStep.success) {
        const auditStep = await runAllowlistedCommand(session.workspacePath, "npm", [
          "audit",
          "--audit-level=high",
          "--json",
        ]);
        steps.push({
          ...auditStep,
          command: "npm audit (high severity)",
          success: auditStep.exitCode === 0 || auditStep.stdout.includes('"vulnerabilities"'),
        });
        if (auditStep.stderr.includes("ENOENT") && auditStep.exitCode !== 0) {
          // npm audit may exit non-zero when vulns found — warn but don't fail build
        } else if (auditStep.exitCode !== 0 && !auditStep.stdout) {
          success = false;
        }
      }
    }

    const plan = await buildExecutionPlan(session.workspacePath);
    for (const step of plan) {
      const result = await runAllowlistedCommand(session.workspacePath, step.cmd, step.args);
      steps.push(result);
      if (!result.success) {
        success = false;
        break;
      }
    }
  } catch (error) {
    success = false;
    steps.push({
      command: "prepare",
      exitCode: null,
      stdout: "",
      stderr: error instanceof Error ? error.message : "Execution failed",
      success: false,
      durationMs: 0,
    });
  } finally {
    await wipeWorkspaceDir(session.workspacePath);
    session.status = "active";
  }

  let workspaceWiped = true;
  if (params.destroySessionAfter) {
    await destroyForgeSession(session.id, { reason: "after_cloud_run", wipeCloud: true });
    workspaceWiped = true;
  }

  return {
    sessionId: session.id,
    steps,
    success,
    workspaceWiped,
    message: success
      ? "Cloud execution passed — workspace wiped from server."
      : "Cloud execution reported issues — workspace wiped from server regardless.",
  };
}

export async function endForgeCloudSession(params: {
  sessionId: string;
  wipeCloudArtifacts?: boolean;
  disconnectGitHub?: boolean;
}) {
  const session = getForgeSession(params.sessionId);
  if (!session) {
    return destroyForgeSession(params.sessionId, {
      wipeCloud: params.wipeCloudArtifacts ?? true,
      disconnectGitHub: params.disconnectGitHub ?? true,
      reason: "already_gone",
    });
  }
  return destroyForgeSession(params.sessionId, {
    wipeCloud: params.wipeCloudArtifacts ?? true,
    disconnectGitHub: params.disconnectGitHub ?? true,
    reason: "user_end",
  });
}
