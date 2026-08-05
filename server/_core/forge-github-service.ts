/**
 * GitHub integration for forge sandboxes — connect repo, pull/push files securely.
 */

import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

type GitHubLink = {
  token: string;
  owner: string;
  repo: string;
  defaultBranch: string;
  linkedAt: string;
};

const links = new Map<string, GitHubLink>();

function linkKey(userId: string, specialist: "coder" | "game"): string {
  return `${specialist}:${userId}`;
}

async function ghFetch(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `GitHub API error (${res.status}): ${body.slice(0, 200)}`,
    });
  }
  return res.json();
}

export async function connectForgeGitHub(params: {
  userId: string;
  specialist: "coder" | "game";
  token?: string;
  owner: string;
  repo: string;
}): Promise<{ ok: true; owner: string; repo: string; defaultBranch: string }> {
  const token = params.token?.trim() || ENV.githubToken;
  if (!token) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Set GITHUB_TOKEN in server .env or pass a personal access token.",
    });
  }

  const repo = await ghFetch(token, `/repos/${params.owner}/${params.repo}`);
  const link: GitHubLink = {
    token,
    owner: params.owner,
    repo: params.repo,
    defaultBranch: repo.default_branch ?? "main",
    linkedAt: new Date().toISOString(),
  };
  links.set(linkKey(params.userId, params.specialist), link);
  return { ok: true, owner: link.owner, repo: link.repo, defaultBranch: link.defaultBranch };
}

export function getForgeGitHubStatus(userId: string, specialist: "coder" | "game") {
  const link = links.get(linkKey(userId, specialist));
  if (!link) return { connected: false as const };
  return {
    connected: true as const,
    owner: link.owner,
    repo: link.repo,
    defaultBranch: link.defaultBranch,
    linkedAt: link.linkedAt,
  };
}

export async function pullForgeFromGitHub(params: {
  userId: string;
  specialist: "coder" | "game";
  paths?: string[];
}): Promise<Array<{ path: string; content: string }>> {
  const link = links.get(linkKey(params.userId, params.specialist));
  if (!link) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Connect GitHub first." });
  }

  const ref = await ghFetch(
    link.token,
    `/repos/${link.owner}/${link.repo}/git/ref/heads/${link.defaultBranch}`,
  );
  const commitSha = ref.object?.sha;
  if (!commitSha) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Could not resolve default branch." });
  }

  const commit = await ghFetch(link.token, `/repos/${link.owner}/${link.repo}/git/commits/${commitSha}`);
  const treeSha = commit.tree?.sha;
  if (!treeSha) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Could not read repo tree." });
  }

  const tree = await ghFetch(
    link.token,
    `/repos/${link.owner}/${link.repo}/git/trees/${treeSha}?recursive=1`,
  );
  const blobs: Array<{ path: string; sha: string }> = (tree.tree ?? [])
    .filter(
      (n: { type: string; path: string; size?: number; sha?: string }) =>
        n.type === "blob" && (n.size ?? 0) < 500_000 && Boolean(n.sha),
    )
    .map((n: { path: string; sha: string }) => ({ path: n.path, sha: n.sha }));

  const targetPaths = params.paths?.length ? new Set(params.paths) : null;
  const files: Array<{ path: string; content: string }> = [];

  for (const blob of blobs) {
    if (targetPaths && !targetPaths.has(blob.path)) continue;
    if (/\.(png|jpg|gif|zip|exe|dll)$/i.test(blob.path)) continue;

    const blobData = await ghFetch(link.token, `/repos/${link.owner}/${link.repo}/git/blobs/${blob.sha}`);
    if (blobData.encoding === "base64" && blobData.content) {
      const content = Buffer.from(blobData.content.replace(/\n/g, ""), "base64").toString("utf8");
      files.push({ path: blob.path, content });
    }
  }

  return files;
}

export async function pushForgeToGitHub(params: {
  userId: string;
  specialist: "coder" | "game";
  files: Array<{ path: string; content: string }>;
  message: string;
}): Promise<{ ok: true; commitSha?: string }> {
  const link = links.get(linkKey(params.userId, params.specialist));
  if (!link) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Connect GitHub first." });
  }

  if (params.files.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No files to push." });
  }

  if (params.files.length === 1) {
    const file = params.files[0]!;
    const existing = await fetch(
      `https://api.github.com/repos/${link.owner}/${link.repo}/contents/${file.path}`,
      {
        headers: { Authorization: `Bearer ${link.token}`, Accept: "application/vnd.github+json" },
      },
    );
    let sha: string | undefined;
    if (existing.ok) {
      const data = (await existing.json()) as { sha: string };
      sha = data.sha;
    }
    const result = await ghFetch(link.token, `/repos/${link.owner}/${link.repo}/contents/${file.path}`, {
      method: "PUT",
      body: JSON.stringify({
        message: params.message.slice(0, 200),
        content: Buffer.from(file.content, "utf8").toString("base64"),
        branch: link.defaultBranch,
        sha,
      }),
    });
    return { ok: true, commitSha: result.commit?.sha };
  }

  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Multi-file push: apply patches in sandbox first, then push one file at a time or use Git locally.",
  });
}

export function disconnectForgeGitHub(userId: string, specialist: "coder" | "game"): boolean {
  return links.delete(linkKey(userId, specialist));
}
