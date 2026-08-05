import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { isGameForge } from "@/lib/forge-specialists";

export type ForgeBuildToolsPanelProps = {
  creatorId: string;
  projectId: string | null;
  onRefreshProjects?: () => void;
};

export function ForgeBuildToolsPanel({
  creatorId,
  projectId,
  onRefreshProjects,
}: ForgeBuildToolsPanelProps) {
  const colors = useColors();
  const specialist = isGameForge(creatorId) ? "game" : "coder";
  const utils = trpc.useUtils();

  const templates = trpc.forgeAgent.listTemplates.useQuery({ specialist });
  const deployTargets = trpc.forgeAgent.listDeployTargets.useQuery({ specialist });
  const hivePacks = trpc.forgeAgent.listHiveAssetPacks.useQuery({ specialist });
  const exportZip = trpc.forgeAgent.exportZip.useMutation();
  const applyDeploy = trpc.forgeAgent.applyDeployWizard.useMutation({
    onSuccess: () => {
      void utils.coderSandbox.listProjects.invalidate();
      void utils.gameDevSandbox.listProjects.invalidate();
    },
  });
  const importHive = trpc.forgeAgent.importHiveAssetPack.useMutation({
    onSuccess: () => {
      void utils.coderSandbox.listProjects.invalidate();
      void utils.gameDevSandbox.listProjects.invalidate();
    },
  });
  const createShare = trpc.forgeAgent.createShareLink.useMutation();
  const sessionStatus = trpc.forgeAgent.getSessionStatus.useQuery({ specialist });
  const deployReady = trpc.forgeAgent.deployReadiness.useQuery(
    { creatorId, projectId: projectId! },
    { enabled: Boolean(projectId) },
  );

  const runCloudExecution = trpc.forgeAgent.runCloudExecution.useMutation();
  const endCloudSession = trpc.forgeAgent.endCloudSession.useMutation({
    onSuccess: () => void utils.forgeAgent.getSessionStatus.invalidate({ specialist }),
  });
  const endAllSessions = trpc.forgeAgent.endAllSessions.useMutation({
    onSuccess: () => void utils.forgeAgent.getSessionStatus.invalidate({ specialist }),
  });
  const githubStatus = trpc.forgeAgent.githubStatus.useQuery({ specialist });
  const preview = trpc.forgeAgent.getPreview.useQuery(
    { creatorId, projectId: projectId! },
    { enabled: Boolean(projectId) },
  );

  const applyTemplate = trpc.forgeAgent.applyTemplate.useMutation({
    onSuccess: () => {
      void utils.coderSandbox.listProjects.invalidate();
      void utils.gameDevSandbox.listProjects.invalidate();
      onRefreshProjects?.();
    },
  });
  const runAgent = trpc.forgeAgent.runAgent.useMutation();
  const proposePatches = trpc.forgeAgent.proposePatches.useMutation();
  const applyPatches = trpc.forgeAgent.applyPatches.useMutation({
    onSuccess: () => {
      void utils.coderSandbox.listProjects.invalidate();
      void utils.gameDevSandbox.listProjects.invalidate();
      setPendingPatches(null);
    },
  });
  const runPipeline = trpc.forgeAgent.runPipeline.useMutation();
  const generateCi = trpc.forgeAgent.generateCi.useMutation({
    onSuccess: () => {
      void utils.coderSandbox.listProjects.invalidate();
      void utils.gameDevSandbox.listProjects.invalidate();
    },
  });
  const githubConnect = trpc.forgeAgent.githubConnect.useMutation({
    onSuccess: () => void utils.forgeAgent.githubStatus.invalidate({ specialist }),
  });
  const githubPull = trpc.forgeAgent.githubPull.useMutation({
    onSuccess: () => {
      void utils.coderSandbox.listProjects.invalidate();
      void utils.gameDevSandbox.listProjects.invalidate();
    },
  });
  const playtest = trpc.forgeAgent.playtestChecklist.useQuery(
    { creatorId, projectId: projectId! },
    { enabled: Boolean(projectId) && specialist === "game" },
  );

  useEffect(() => {
    if (sessionStatus.data?.active && "sessionId" in sessionStatus.data) {
      setActiveSessionId(sessionStatus.data.sessionId);
    }
  }, [sessionStatus.data]);

  const [agentGoal, setAgentGoal] = useState("");
  const [cloudOutput, setCloudOutput] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [patchInstruction, setPatchInstruction] = useState("");
  const [autoApply, setAutoApply] = useState(false);
  const [pendingPatches, setPendingPatches] = useState<
    Array<{ path: string; action: "create" | "update" | "delete"; content?: string }> | null
  >(null);
  const [agentResult, setAgentResult] = useState<string | null>(null);
  const [pipelineResult, setPipelineResult] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [exportInfo, setExportInfo] = useState<string | null>(null);
  const [deploySteps, setDeploySteps] = useState<string | null>(null);
  const [ghOwner, setGhOwner] = useState("");
  const [ghRepo, setGhRepo] = useState("");
  const [ghToken, setGhToken] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  if (!projectId) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          Select or create a project to use Agent, Templates, Preview, and GitHub tools.
        </Text>
      </View>
    );
  }

  const handleRunAgent = () => {
    if (!agentGoal.trim()) return;
    runAgent.mutate(
      { creatorId, projectId, goal: agentGoal.trim(), autoApply },
      {
        onSuccess: (r) => {
          setAgentResult(
            `${r.steps.map((s) => `Step ${s.step}: ${s.summary}`).join("\n")}\n\n${r.reply.slice(0, 500)}`,
          );
          if (r.patches?.length && !autoApply) setPendingPatches(r.patches);
          onRefreshProjects?.();
        },
      },
    );
  };

  const handleProposePatches = () => {
    if (!patchInstruction.trim()) return;
    proposePatches.mutate(
      { creatorId, projectId, instruction: patchInstruction.trim() },
      {
        onSuccess: (r) => {
          setPendingPatches(r.patches);
          setAgentResult(r.reply.slice(0, 800));
        },
      },
    );
  };

  return (
    <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: 10, paddingBottom: 12 }}>
      {/* Ephemeral cloud security */}
      <View style={[styles.card, { backgroundColor: "#0f172a", borderColor: "#334155" }]}>
        <Text style={[styles.title, { color: "#e2e8f0" }]}>🔒 Ephemeral cloud execution</Text>
        <Text style={{ color: "#94a3b8", fontSize: 11, marginTop: 4, lineHeight: 16 }}>
          {sessionStatus.data?.policy ??
            "Temp workspaces are wiped after each run, on End session, or after 30 min TTL."}
        </Text>
        {sessionStatus.data?.active && "expiresAt" in sessionStatus.data ? (
          <Text style={{ color: "#6ee7b7", fontSize: 11, marginTop: 6 }}>
            Active session · expires {new Date(sessionStatus.data.expiresAt).toLocaleTimeString()}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          <Pressable
            onPress={() => {
              if (!projectId) return;
              runCloudExecution.mutate(
                { creatorId, projectId, destroySessionAfter: false },
                {
                  onSuccess: (r) => {
                    setActiveSessionId(r.sessionId);
                    setCloudOutput(
                      r.steps
                        .map(
                          (s) =>
                            `${s.success ? "✅" : "❌"} ${s.command}\n${s.stderr || s.stdout}`.slice(0, 400),
                        )
                        .join("\n\n") + `\n\n${r.message}`,
                    );
                    void utils.forgeAgent.getSessionStatus.invalidate({ specialist });
                  },
                },
              );
            }}
            disabled={runCloudExecution.isPending || !projectId}
            style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }]}
          >
            <Text style={styles.btnText}>
              {runCloudExecution.isPending ? "Running…" : "Run in cloud"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              const sid = activeSessionId ?? (sessionStatus.data?.active && "sessionId" in sessionStatus.data ? sessionStatus.data.sessionId : null);
              if (sid) {
                endCloudSession.mutate({ sessionId: sid, wipeCloudArtifacts: true, disconnectGitHub: true });
              } else {
                endAllSessions.mutate();
              }
              setCloudOutput("Cloud workspace wiped from server.");
              setActiveSessionId(null);
            }}
            disabled={endCloudSession.isPending || endAllSessions.isPending}
            style={[styles.btn, { borderColor: "#ef4444", borderWidth: 1, flex: 1 }]}
          >
            <Text style={{ color: "#ef4444", fontWeight: "700", textAlign: "center" }}>End & wipe</Text>
          </Pressable>
        </View>
        {cloudOutput ? (
          <Text style={{ color: "#94a3b8", fontSize: 10, marginTop: 8, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", lineHeight: 14 }}>
            {cloudOutput}
          </Text>
        ) : null}
      </View>

      {deployReady.data ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            🚀 Deploy readiness — {deployReady.data.score}%
          </Text>
          {specialist === "game" && deployReady.data.mobileStores ? (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <View
                style={[
                  styles.storeBadge,
                  {
                    borderColor: deployReady.data.mobileStores.appleReady ? "#22c55e" : colors.border,
                    backgroundColor: deployReady.data.mobileStores.appleReady ? "#22c55e18" : colors.surface,
                  },
                ]}
              >
                <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: "700" }}>
                  {deployReady.data.mobileStores.appleReady ? "✅" : "○"} Apple App Store
                </Text>
              </View>
              <View
                style={[
                  styles.storeBadge,
                  {
                    borderColor: deployReady.data.mobileStores.googleReady ? "#22c55e" : colors.border,
                    backgroundColor: deployReady.data.mobileStores.googleReady ? "#22c55e18" : colors.surface,
                  },
                ]}
              >
                <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: "700" }}>
                  {deployReady.data.mobileStores.googleReady ? "✅" : "○"} Google Play
                </Text>
              </View>
            </View>
          ) : null}
          {deployReady.data.items.map((item) => (
            <Text key={item.id} style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
              {item.status === "pass" ? "✅" : item.status === "warn" ? "⚠️" : "❌"} {item.label}
            </Text>
          ))}
        </View>
      ) : null}

      {/* Templates */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>⚡ Quick start templates</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {templates.data?.map((t) => (
            <Pressable
              key={t.id}
              onPress={() =>
                applyTemplate.mutate({
                  specialist,
                  templateId: t.id,
                  projectName: t.label,
                })
              }
              disabled={applyTemplate.isPending}
              style={[styles.chip, { borderColor: colors.primary }]}
            >
              <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: "700" }}>{t.label}</Text>
              <Text style={{ color: colors.muted, fontSize: 9, marginTop: 2 }} numberOfLines={2}>
                {t.description}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Autonomous agent */}
      <View style={[styles.card, { backgroundColor: `${colors.primary}12`, borderColor: colors.primary }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>🤖 Build agent (Manus-style)</Text>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
          Plans, proposes file changes, tests, and previews — up to 5 steps.
        </Text>
        <TextInput
          value={agentGoal}
          onChangeText={setAgentGoal}
          placeholder="Build a playable HTML5 game with score…"
          placeholderTextColor={colors.muted}
          multiline
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, marginTop: 8 }]}
        />
        <Pressable onPress={() => setAutoApply(!autoApply)} style={{ marginTop: 6 }}>
          <Text style={{ color: colors.primary, fontSize: 12 }}>
            {autoApply ? "✓ Auto-apply patches" : "○ Review patches before apply"}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleRunAgent}
          disabled={runAgent.isPending}
          style={[styles.btn, { backgroundColor: colors.primary, marginTop: 8 }]}
        >
          <Text style={styles.btnText}>{runAgent.isPending ? "Agent working…" : "Run build agent"}</Text>
        </Pressable>
      </View>

      {/* Apply patches from chat */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>📝 Apply to sandbox</Text>
        <TextInput
          value={patchInstruction}
          onChangeText={setPatchInstruction}
          placeholder="Add a jump mechanic to Player.gd…"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, marginTop: 6 }]}
        />
        <Pressable
          onPress={handleProposePatches}
          disabled={proposePatches.isPending}
          style={[styles.btn, { borderColor: colors.primary, borderWidth: 1, marginTop: 8 }]}
        >
          <Text style={{ color: colors.primary, fontWeight: "700", textAlign: "center" }}>
            {proposePatches.isPending ? "Generating…" : "Generate patch diff"}
          </Text>
        </Pressable>
      </View>

      {/* Pending diffs */}
      {pendingPatches?.length ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: "#22c55e" }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Diff review — {pendingPatches.length} file(s)
          </Text>
          {pendingPatches.map((p) => (
            <View key={p.path} style={{ marginTop: 8 }}>
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>
                {p.action}: {p.path}
              </Text>
              {p.content ? (
                <Text style={{ color: colors.muted, fontSize: 10, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }} numberOfLines={4}>
                  {p.content.slice(0, 200)}…
                </Text>
              ) : null}
            </View>
          ))}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <Pressable
              onPress={() =>
                applyPatches.mutate({ creatorId, projectId, patches: pendingPatches })
              }
              disabled={applyPatches.isPending}
              style={[styles.btn, { backgroundColor: "#22c55e", flex: 1 }]}
            >
              <Text style={styles.btnText}>{applyPatches.isPending ? "Applying…" : "Apply all"}</Text>
            </Pressable>
            <Pressable
              onPress={() => setPendingPatches(null)}
              style={[styles.btn, { borderColor: colors.border, borderWidth: 1, flex: 1 }]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "700", textAlign: "center" }}>Discard</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Preview + pipeline */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>👁 Live preview & pipeline</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Pressable
            onPress={() => setShowPreview(!showPreview)}
            style={[styles.btn, { borderColor: colors.primary, borderWidth: 1, flex: 1 }]}
          >
            <Text style={{ color: colors.primary, fontWeight: "700", textAlign: "center" }}>
              {showPreview ? "Hide preview" : "Show preview"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() =>
              runPipeline.mutate(
                { creatorId, projectId },
                {
                  onSuccess: (r) => {
                    const lines = [
                      r.test.success ? "✅ Tests passed" : `⚠️ ${r.test.issues?.join("; ")}`,
                      r.preview.kind !== "none" ? "Preview ready" : r.preview.message,
                    ];
                    if (r.playtest) lines.push(`Playtest score: ${r.playtest.score}%`);
                    setPipelineResult(lines.join("\n"));
                  },
                },
              )
            }
            disabled={runPipeline.isPending}
            style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }]}
          >
            <Text style={styles.btnText}>{runPipeline.isPending ? "Running…" : "Full pipeline"}</Text>
          </Pressable>
        </View>
        {showPreview && preview.data?.html ? (
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8, lineHeight: 16 }}>
            Preview ready ({preview.data.kind}). Use Full pipeline or open Build → HTML5 template for in-browser play on web.
          </Text>
        ) : preview.data?.message ? (
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>{preview.data.message}</Text>
        ) : null}
        {pipelineResult ? (
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8, lineHeight: 16 }}>{pipelineResult}</Text>
        ) : null}
        <Pressable
          onPress={() => generateCi.mutate({ creatorId, projectId })}
          disabled={generateCi.isPending}
          style={[styles.btn, { borderColor: colors.border, borderWidth: 1, marginTop: 8 }]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "600", textAlign: "center" }}>
            {generateCi.isPending ? "Generating CI…" : "Generate GitHub Actions CI"}
          </Text>
        </Pressable>
      </View>

      {/* Game playtest */}
      {specialist === "game" && playtest.data ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            🎮 Playtest checklist — {playtest.data.score}%
          </Text>
          {playtest.data.items.map((item) => (
            <Text key={item.id} style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
              {item.status === "pass" ? "✅" : item.status === "warn" ? "⚠️" : "❌"} {item.check}
            </Text>
          ))}
        </View>
      ) : null}

      {/* Export, deploy, share */}
      {specialist === "game" ? (
        <View style={[styles.card, { backgroundColor: "#1e1b4b", borderColor: "#6366f1" }]}>
          <Text style={[styles.title, { color: "#e0e7ff" }]}>📱 Ship simple games — Apple & Google</Text>
          <Text style={{ color: "#a5b4fc", fontSize: 11, marginTop: 4, lineHeight: 16 }}>
            Start with the “Simple mobile game (iOS & Android)” template, then generate store configs. EAS builds in the cloud — no Mac required for iOS.
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <Pressable
              onPress={() => {
                if (!projectId) return;
                applyDeploy.mutate(
                  { creatorId, projectId, target: "apple-app-store" },
                  {
                    onSuccess: (w) => {
                      setDeploySteps(w.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"));
                      void utils.forgeAgent.deployReadiness.invalidate({ creatorId, projectId });
                    },
                  },
                );
              }}
              disabled={applyDeploy.isPending || !projectId}
              style={[styles.btn, { backgroundColor: "#007AFF", flex: 1 }]}
            >
              <Text style={styles.btnText}>
                {applyDeploy.isPending ? "Generating…" : "Apple App Store"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!projectId) return;
                applyDeploy.mutate(
                  { creatorId, projectId, target: "google-play-store" },
                  {
                    onSuccess: (w) => {
                      setDeploySteps(w.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"));
                      void utils.forgeAgent.deployReadiness.invalidate({ creatorId, projectId });
                    },
                  },
                );
              }}
              disabled={applyDeploy.isPending || !projectId}
              style={[styles.btn, { backgroundColor: "#34A853", flex: 1 }]}
            >
              <Text style={styles.btnText}>
                {applyDeploy.isPending ? "Generating…" : "Google Play"}
              </Text>
            </Pressable>
          </View>
          {deploySteps ? (
            <Text style={{ color: "#c7d2fe", fontSize: 10, marginTop: 10, lineHeight: 15 }}>{deploySteps}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>📦 Export & deploy</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <Pressable
            onPress={() => {
              if (!projectId) return;
              exportZip.mutate(
                { creatorId, projectId },
                {
                  onSuccess: (z) => {
                    setExportInfo(`${z.fileName} · ${z.fileCount} files · ${Math.round(z.sizeBytes / 1024)} KB`);
                    if (Platform.OS === "web" && typeof document !== "undefined") {
                      const a = document.createElement("a");
                      a.href = `data:application/zip;base64,${z.base64}`;
                      a.download = z.fileName;
                      a.click();
                    }
                  },
                },
              );
            }}
            disabled={exportZip.isPending || !projectId}
            style={[styles.btn, { borderColor: colors.primary, borderWidth: 1, flex: 1, minWidth: 120 }]}
          >
            <Text style={{ color: colors.primary, fontWeight: "700", textAlign: "center" }}>
              {exportZip.isPending ? "Zipping…" : "Download ZIP"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (!projectId) return;
              createShare.mutate(
                { creatorId, projectId },
                {
                  onSuccess: (s) => {
                    const base =
                      typeof window !== "undefined" && window.location?.origin
                        ? window.location.origin
                        : "http://localhost:3000";
                    setShareUrl(`${base}${s.sharePath}`);
                  },
                },
              );
            }}
            disabled={createShare.isPending || !projectId}
            style={[styles.btn, { borderColor: colors.border, borderWidth: 1, flex: 1, minWidth: 120 }]}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700", textAlign: "center" }}>
              {createShare.isPending ? "Creating…" : "Share preview (24h)"}
            </Text>
          </Pressable>
        </View>
        {exportInfo ? (
          <Text style={{ color: colors.muted, fontSize: 10, marginTop: 6 }}>Exported: {exportInfo}</Text>
        ) : null}
        {shareUrl ? (
          <Text style={{ color: colors.primary, fontSize: 10, marginTop: 6 }} selectable>
            {shareUrl}
          </Text>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {deployTargets.data?.map((target) => {
            const labels: Record<string, string> = {
              "apple-app-store": "Apple App Store",
              "google-play-store": "Google Play",
              "expo-eas": "Expo EAS",
              vercel: "Vercel",
              "itch-io": "itch.io",
              "github-pages": "GitHub Pages",
            };
            const label = labels[target] ?? target.replace(/-/g, " ");
            if (specialist === "game" && (target === "apple-app-store" || target === "google-play-store")) {
              return null;
            }
            return (
            <Pressable
              key={target}
              onPress={() =>
                projectId &&
                applyDeploy.mutate(
                  { creatorId, projectId, target },
                  {
                    onSuccess: (w) => {
                      setDeploySteps(w.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"));
                      void utils.forgeAgent.deployReadiness.invalidate({ creatorId, projectId });
                    },
                  },
                )
              }
              disabled={applyDeploy.isPending || !projectId}
              style={[styles.chip, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.foreground, fontSize: 10, fontWeight: "700" }}>
                Deploy: {label}
              </Text>
            </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {specialist === "game" && hivePacks.data?.length ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>🐝 Hive asset packs</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {hivePacks.data.map((pack) => (
              <Pressable
                key={pack.id}
                onPress={() =>
                  projectId &&
                  importHive.mutate({ creatorId, projectId, packId: pack.id })
                }
                disabled={importHive.isPending || !projectId}
                style={[styles.chip, { borderColor: colors.primary }]}
              >
                <Text style={{ color: colors.foreground, fontSize: 10, fontWeight: "700" }}>{pack.label}</Text>
                <Text style={{ color: colors.muted, fontSize: 9 }}>{pack.sourceAi}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* GitHub */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>🔗 GitHub sync</Text>
        {githubStatus.data?.connected ? (
          <Text style={{ color: colors.primary, fontSize: 12, marginTop: 4 }}>
            Connected: {githubStatus.data.owner}/{githubStatus.data.repo}
          </Text>
        ) : (
          <>
            <TextInput
              value={ghOwner}
              onChangeText={setGhOwner}
              placeholder="owner"
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, marginTop: 6 }]}
            />
            <TextInput
              value={ghRepo}
              onChangeText={setGhRepo}
              placeholder="repo"
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, marginTop: 6 }]}
            />
            <TextInput
              value={ghToken}
              onChangeText={setGhToken}
              placeholder="GitHub token (optional if GITHUB_TOKEN in .env)"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, marginTop: 6 }]}
            />
            <Pressable
              onPress={() =>
                githubConnect.mutate({
                  specialist,
                  owner: ghOwner.trim(),
                  repo: ghRepo.trim(),
                  token: ghToken.trim() || undefined,
                })
              }
              disabled={githubConnect.isPending}
              style={[styles.btn, { backgroundColor: colors.primary, marginTop: 8 }]}
            >
              <Text style={styles.btnText}>Connect repo</Text>
            </Pressable>
          </>
        )}
        {githubStatus.data?.connected ? (
          <Pressable
            onPress={() => githubPull.mutate({ specialist, projectId })}
            disabled={githubPull.isPending}
            style={[styles.btn, { borderColor: colors.primary, borderWidth: 1, marginTop: 8 }]}
          >
            <Text style={{ color: colors.primary, fontWeight: "700", textAlign: "center" }}>
              {githubPull.isPending ? "Pulling…" : "Pull files from GitHub"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {agentResult ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>{agentResult}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 12 },
  title: { fontSize: 14, fontWeight: "800" },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 13, minHeight: 44 },
  btn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  btnText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  chip: { borderWidth: 1, borderRadius: 10, padding: 10, marginRight: 8, width: 140 },
  storeBadge: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, flex: 1 },
});
