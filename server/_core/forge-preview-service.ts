/**
 * Live preview HTML for sandbox web/game projects.
 */

import type { SandboxProject } from "./coder-sandbox-service";

export type ForgePreview = {
  kind: "html" | "react-snippet" | "none";
  html?: string;
  message?: string;
};

export function buildSandboxPreview(project: SandboxProject): ForgePreview {
  const indexHtml = project.files.find((f) => f.path === "index.html" || f.path.endsWith("/index.html"));
  if (indexHtml) {
    let html = indexHtml.content;
    for (const file of project.files) {
      if (file.path.endsWith(".js") && file.path !== "index.html") {
        const name = file.path.split("/").pop()!;
        html = html.replace(
          new RegExp(`src=["']${name.replace(".", "\\.")}["']`, "i"),
          `src="data:text/javascript;base64,${Buffer.from(file.content).toString("base64")}"`,
        );
      }
      if (file.path.endsWith(".css")) {
        const name = file.path.split("/").pop()!;
        html = html.replace(
          new RegExp(`href=["']${name.replace(".", "\\.")}["']`, "i"),
          `<style>${file.content}</style>`,
        );
        html = html.replace(new RegExp(`<link[^>]*${name}[^>]*>`, "i"), "");
      }
    }
    const gameJs = project.files.find((f) => f.path === "game.js");
    if (gameJs && !html.includes("data:text/javascript")) {
      html = html.replace(
        /<script[^>]*src=["']game\.js["'][^>]*><\/script>/i,
        `<script>${gameJs.content}</script>`,
      );
    }
    return { kind: "html", html };
  }

  const appTsx = project.files.find(
    (f) => f.path === "App.tsx" || f.path === "src/App.tsx" || f.path.endsWith("/App.tsx"),
  );
  if (appTsx) {
    const snippet = appTsx.content.slice(0, 8000);
    const previewHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${project.name}</title>
<style>body{font-family:system-ui;padding:24px;background:#0f172a;color:#e2e8f0}
pre{white-space:pre-wrap;background:#1e293b;padding:16px;border-radius:12px;font-size:12px}
.note{color:#94a3b8;font-size:13px;margin-bottom:12px}</style></head><body>
<p class="note">React Native preview — run in Expo for full device preview. Structure below:</p>
<pre>${escapeHtml(snippet)}</pre></body></html>`;
    return { kind: "react-snippet", html: previewHtml };
  }

  const gdMain = project.files.find((f) => f.path.endsWith("Player.gd") || f.path.endsWith("main.gd"));
  if (gdMain) {
    return {
      kind: "react-snippet",
      html: `<!DOCTYPE html><html><body style="font-family:monospace;padding:20px;background:#1a1a2e;color:#eee">
<h3>${project.name} — Godot script preview</h3>
<pre>${escapeHtml(gdMain.content)}</pre>
<p style="color:#888">Export HTML5 from Godot or use the HTML5 template for in-browser play.</p></body></html>`,
    };
  }

  return {
    kind: "none",
    message: "Add index.html (HTML5 game) or App.tsx (Expo) for live preview.",
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
