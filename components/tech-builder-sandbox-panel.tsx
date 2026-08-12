import { useState } from "react";
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
import { ForgeBuildToolsPanel } from "@/components/forge-build-tools-panel";
import { ForgePlatformHandoffBanner } from "@/components/forge-platform-handoff-banner";
import { TECH_BUILDER_ID } from "@/lib/forge-specialists";
import { assessForgeProjectScale } from "@/lib/forge-platform-handoff";
import { usePlatformOwner } from "@/lib/use-platform-owner";

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function TechBuilderSandboxPanel({
  initialFilePath,
  initialFileContent,
}: {
  initialFilePath?: string;
  initialFileContent?: string;
} = {}) {
  const colors = useColors();
  const { hasFullPlatformAccess } = usePlatformOwner();
  const utils = trpc.useUtils();

  const status = trpc.coderSandbox.getStatus.useQuery();
  const projects = trpc.coderSandbox.listProjects.useQuery();
  const createProject = trpc.coderSandbox.createProject.useMutation({
    onSuccess: () => {
      void utils.coderSandbox.listProjects.invalidate();
      void utils.coderSandbox.getStatus.invalidate();
    },
  });
  const saveFile = trpc.coderSandbox.saveFile.useMutation({
    onSuccess: () => {
      void utils.coderSandbox.listProjects.invalidate();
      void utils.coderSandbox.getStatus.invalidate();
    },
  });
  const runTest = trpc.coderSandbox.runTest.useMutation();
  const executeBuild = trpc.coderSandbox.executeBuild.useMutation();
  const createCheckout = trpc.coderSandbox.createUpgradeCheckout.useMutation();
  const confirmPayment = trpc.coderSandbox.confirmUpgradePayment.useMutation({
    onSuccess: () => void utils.coderSandbox.getStatus.invalidate(),
  });
  const upgradeTier = trpc.coderSandbox.upgradeTier.useMutation({
    onSuccess: () => void utils.coderSandbox.getStatus.invalidate(),
  });

  const [projectName, setProjectName] = useState("My App");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [filePath, setFilePath] = useState(initialFilePath ?? "App.tsx");
  const [fileContent, setFileContent] = useState(
    initialFileContent ??
    `import { View, Text } from "react-native";\n\nexport default function App() {\n  return (\n    <View>\n      <Text>Hello from TechBuilder sandbox</Text>\n    </View>\n  );\n}\n`,
  );
  const [testResult, setTestResult] = useState<string | null>(null);
  const [checkoutPending, setCheckoutPending] = useState<string | null>(null);
  const [lastBundleKb, setLastBundleKb] = useState(0);

  const selectedProject = projects.data?.find((p) => p.id === selectedProjectId) ?? projects.data?.[0];
  const tier = status.data?.tier;
  const nextTier = status.data?.nextTier;
  const forgeHandoff = assessForgeProjectScale({
    isNativeApp: Platform.OS !== "web",
    creatorId: TECH_BUILDER_ID,
    usagePercent: status.data?.usagePercent,
    projectFileCount: selectedProject?.files.length,
    editingFileChars: fileContent.length,
    estimatedBundleKb: lastBundleKb,
    tierId: tier?.id,
  });

  const handleCreateProject = () => {
    createProject.mutate(
      { name: projectName, framework: "React Native / Expo" },
      {
        onSuccess: (proj) => setSelectedProjectId(proj.id),
      },
    );
  };

  const handleSaveFile = () => {
    if (!selectedProject) return;
    saveFile.mutate({
      projectId: selectedProject.id,
      path: filePath,
      content: fileContent,
      persistToCloud: true,
    });
  };

  const handleRunTest = () => {
    if (!selectedProject) return;
    runTest.mutate(
      { projectId: selectedProject.id },
      {
        onSuccess: (result) => {
          setTestResult(
            result.success
              ? `✅ All ${result.filesChecked} file(s) passed structure checks.`
              : `⚠️ Issues:\n${result.issues.join("\n")}`,
          );
        },
      },
    );
  };

  const handleExecuteBuild = () => {
    if (!selectedProject) return;
    executeBuild.mutate(
      { projectId: selectedProject.id },
      {
        onSuccess: (report) => {
          setLastBundleKb(report.estimatedBundleKb ?? 0);
          const lines = [
            report.success ? "✅ Build simulation passed" : "⚠️ Build issues found",
            `Files: ${report.filesChecked} · Lines: ${report.totalLines} · Est. bundle: ${report.estimatedBundleKb} KB`,
          ];
          if (report.entryPoints.length) lines.push(`Entry: ${report.entryPoints.join(", ")}`);
          if (report.warnings.length) lines.push(`Warnings:\n${report.warnings.join("\n")}`);
          if (report.issues.length) lines.push(`Issues:\n${report.issues.join("\n")}`);
          setTestResult(lines.join("\n"));
        },
      },
    );
  };

  const handleUpgrade = () => {
    if (!nextTier) return;
    if (hasFullPlatformAccess) {
      upgradeTier.mutate({ tier: nextTier.id });
      return;
    }
    createCheckout.mutate(
      { tier: nextTier.id },
      {
        onSuccess: (checkout) => {
          if ("mode" in checkout && checkout.mode === "checkout") {
            setCheckoutPending(checkout.paymentIntentId);
            confirmPayment.mutate({ paymentIntentId: checkout.paymentIntentId });
          }
        },
      },
    );
  };

  if (status.isLoading) {
    return (
      <View style={{ padding: 24, alignItems: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 12, gap: 12 }}>
      <ForgePlatformHandoffBanner
        creatorId={TECH_BUILDER_ID}
        usagePercent={status.data?.usagePercent}
        projectFileCount={selectedProject?.files.length}
        editingFileChars={fileContent.length}
        estimatedBundleKb={lastBundleKb}
        tierId={tier?.id}
      />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>
          🏗️ Sandbox — {tier?.label ?? "Starter"}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
          {tier?.description}
        </Text>
        <View style={[styles.usageBar, { backgroundColor: colors.border, marginTop: 10 }]}>
          <View
            style={[
              styles.usageFill,
              {
                backgroundColor: colors.primary,
                width: `${Math.min(100, status.data?.usagePercent ?? 0)}%`,
              },
            ]}
          />
        </View>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
          {formatBytes(status.data?.usedBytes ?? 0)} / {formatBytes(tier?.storageBytes ?? 0)} ·{" "}
          {status.data?.projectCount ?? 0}/{tier?.maxProjects ?? 0} projects
        </Text>
        {hasFullPlatformAccess ? (
          <Text style={{ color: colors.primary, fontSize: 11, marginTop: 4, fontWeight: "600" }}>
            Owner: Enterprise sandbox unlocked
          </Text>
        ) : nextTier ? (
          <Pressable
            onPress={handleUpgrade}
            disabled={createCheckout.isPending || confirmPayment.isPending || upgradeTier.isPending}
            style={[styles.upgradeBtn, { backgroundColor: colors.primary, marginTop: 10 }]}
          >
            <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>
              {createCheckout.isPending || confirmPayment.isPending || upgradeTier.isPending
                ? "Processing…"
                : hasFullPlatformAccess
                  ? `Upgrade to ${nextTier.label} (${formatBytes(nextTier.storageBytes)})`
                  : `Pay $${nextTier.upgradePriceUsd?.toFixed(2)} — ${nextTier.label} (${formatBytes(nextTier.storageBytes)})`}
            </Text>
          </Pressable>
        ) : null}
        {checkoutPending ? (
          <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>
            Payment ref: {checkoutPending.slice(0, 12)}…
          </Text>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>New project</Text>
        <TextInput
          value={projectName}
          onChangeText={setProjectName}
          placeholder="Project name"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
        />
        <Pressable
          onPress={handleCreateProject}
          disabled={createProject.isPending}
          style={[styles.btn, { backgroundColor: colors.primary }]}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {createProject.isPending ? "Creating…" : "Create sandbox project"}
          </Text>
        </Pressable>
      </View>

      {projects.data && projects.data.length > 0 ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Projects</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {projects.data.map((p) => {
              const active = (selectedProject?.id ?? "") === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setSelectedProjectId(p.id)}
                  style={[
                    styles.projectChip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? `${colors.primary}18` : "transparent",
                    },
                  ]}
                >
                  <Text style={{ color: colors.foreground, fontWeight: active ? "700" : "500", fontSize: 12 }}>
                    {p.name} ({p.files.length} files)
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {selectedProject ? (
        <>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              Edit file — {selectedProject.name}
            </Text>
            <TextInput
              value={filePath}
              onChangeText={setFilePath}
              placeholder="src/App.tsx"
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            />
            <TextInput
              value={fileContent}
              onChangeText={setFileContent}
              multiline
              textAlignVertical="top"
              placeholder="Source code…"
              placeholderTextColor={colors.muted}
              style={[
                styles.codeInput,
                { color: colors.foreground, borderColor: colors.border },
              ]}
            />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <Pressable
                onPress={handleSaveFile}
                disabled={saveFile.isPending}
                style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }]}
              >
                <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>
                  {saveFile.isPending ? "Saving…" : "Save to sandbox"}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleRunTest}
                disabled={runTest.isPending}
                style={[styles.btn, { borderColor: colors.border, borderWidth: 1, flex: 1 }]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "700", textAlign: "center" }}>
                  {runTest.isPending ? "Testing…" : "Quick test"}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleExecuteBuild}
                disabled={executeBuild.isPending}
                style={[styles.btn, { borderColor: colors.primary, borderWidth: 1, flex: 1 }]}
              >
                <Text style={{ color: colors.primary, fontWeight: "700", textAlign: "center" }}>
                  {executeBuild.isPending ? "Building…" : "Full build"}
                </Text>
              </Pressable>
            </View>
            {testResult ? (
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8, lineHeight: 18 }}>
                {testResult}
              </Text>
            ) : null}
          </View>

          {selectedProject.files.length > 0 ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Project files</Text>
              {selectedProject.files.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => {
                    setFilePath(f.path);
                    setFileContent(f.content);
                  }}
                  style={{ paddingVertical: 6 }}
                >
                  <Text style={{ color: colors.primary, fontSize: 13 }}>
                    {f.path} · {formatBytes(f.sizeBytes)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      {!forgeHandoff.shouldHandoffToWeb ? (
        <ForgeBuildToolsPanel
          creatorId={TECH_BUILDER_ID}
          projectId={selectedProject?.id ?? null}
          onRefreshProjects={() => {
            void utils.coderSandbox.listProjects.invalidate();
          }}
        />
      ) : null}

      <View style={[styles.card, { backgroundColor: `${colors.primary}10`, borderColor: colors.primary }]}>
        <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
          Same powers as every specialist
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6, lineHeight: 18 }}>
          Chat · Learn · Hive · Web search · Voice · 3D workspace · Daily streaks — plus Build sandbox with
          Agent mode, templates, GitHub sync, live preview, diff review, and CI generation.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: "800" },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 8, fontSize: 14 },
  codeInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    fontSize: 12,
    fontFamily: "monospace",
    minHeight: 160,
  },
  btn: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, marginTop: 8 },
  upgradeBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  usageBar: { height: 8, borderRadius: 4, overflow: "hidden" },
  usageFill: { height: "100%", borderRadius: 4 },
  projectChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
});
