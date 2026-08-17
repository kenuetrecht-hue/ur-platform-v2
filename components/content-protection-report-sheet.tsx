import { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type ReportType = "impersonation" | "content_theft" | "unauthorized_repost";

type Props = {
  visible: boolean;
  onClose: () => void;
  subjectUserId: string;
  subjectLabel?: string;
  relatedAssetId?: string;
};

const REPORT_TYPES: { id: ReportType; label: string; hint: string }[] = [
  {
    id: "impersonation",
    label: "Impersonation",
    hint: "Copying another creator's name or brand to steal their audience",
  },
  {
    id: "content_theft",
    label: "Content theft",
    hint: "Reposting original work without permission or credit",
  },
  {
    id: "unauthorized_repost",
    label: "Unauthorized repost",
    hint: "Shared public content without proper license or attribution",
  },
];

export function ContentProtectionReportSheet({
  visible,
  onClose,
  subjectUserId,
  subjectLabel,
  relatedAssetId,
}: Props) {
  const colors = useColors();
  const [reportType, setReportType] = useState<ReportType>("content_theft");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = trpc.contentProtection.submitReport.useMutation({
    onSuccess: () => {
      setDone(true);
      setError(null);
    },
    onError: (err) => setError(err.message),
  });

  const close = () => {
    setDescription("");
    setError(null);
    setDone(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={[styles.title, { color: colors.foreground }]}>Report content issue</Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: 12 }}>
              Reports go to the platform owner. False reports may affect your account.
              {subjectLabel ? ` Regarding: ${subjectLabel}` : ""}
            </Text>

            {done ? (
              <View style={{ gap: 12 }}>
                <Text style={{ color: colors.primary, fontWeight: "700" }}>
                  Report submitted. Thank you — we review every case.
                </Text>
                <Pressable onPress={close} style={[styles.btn, { backgroundColor: colors.primary }]}>
                  <Text style={styles.btnText}>Close</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={{ color: colors.foreground, fontWeight: "700", marginBottom: 8 }}>
                  Issue type
                </Text>
                {REPORT_TYPES.map((t) => {
                  const active = reportType === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setReportType(t.id)}
                      style={[
                        styles.typeRow,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? `${colors.primary}12` : colors.background,
                        },
                      ]}
                    >
                      <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
                        {t.label}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 15 }}>{t.hint}</Text>
                    </Pressable>
                  );
                })}

                <Text style={{ color: colors.foreground, fontWeight: "700", marginTop: 12, marginBottom: 6 }}>
                  Details (required)
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe what was copied or misused…"
                  placeholderTextColor={colors.muted}
                  multiline
                  maxLength={1000}
                  style={[
                    styles.input,
                    { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background },
                  ]}
                />

                {error ? (
                  <Text style={{ color: colors.error ?? "#ef4444", fontSize: 12, marginTop: 8 }}>{error}</Text>
                ) : null}

                <Pressable
                  disabled={submit.isPending || description.trim().length < 12}
                  onPress={() =>
                    submit.mutate({
                      reportType,
                      subjectUserId,
                      description: description.trim(),
                      relatedAssetId,
                    })
                  }
                  style={[
                    styles.btn,
                    {
                      backgroundColor: colors.primary,
                      opacity: submit.isPending || description.trim().length < 12 ? 0.5 : 1,
                      marginTop: 16,
                    },
                  ]}
                >
                  {submit.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>Submit report</Text>
                  )}
                </Pressable>
                <Pressable onPress={close} style={{ padding: 12, alignItems: "center" }}>
                  <Text style={{ color: colors.muted }}>Cancel</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    padding: 20,
    maxHeight: "85%",
  },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 8 },
  typeRow: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8, gap: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 88,
    padding: 12,
    fontSize: 14,
    textAlignVertical: "top",
  },
  btn: { borderRadius: 10, padding: 14, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "800" },
});
