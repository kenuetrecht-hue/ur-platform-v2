import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import { brandGradientPair, brandHighlightSurface, withAlpha } from "@/lib/brand-theme";

type MailFolder = "inbox" | "sent" | "compose" | "read";

type MailItem = {
  id: string;
  subject?: string;
  body: string;
  senderEmail?: string;
  recipientEmail?: string;
  senderUserId: string;
  recipientUserId: string;
  createdAt: string;
  readAt?: string;
};

function formatMailDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function InternetCenterMailPanel({
  initialComposeTo,
  onComposeToConsumed,
}: {
  initialComposeTo?: string;
  onComposeToConsumed?: () => void;
} = {}) {
  const colors = useColors();
  const { user } = useAuth();
  const myUserId = user?.id != null ? String(user.id) : "";
  const myEmail = user?.email ?? "";
  const utils = trpc.useUtils();

  const [folder, setFolder] = useState<MailFolder>("inbox");
  const [selected, setSelected] = useState<MailItem | null>(null);
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!initialComposeTo) return;
    setToEmail(initialComposeTo);
    setFolder("compose");
    onComposeToConsumed?.();
  }, [initialComposeTo, onComposeToConsumed]);

  const inbox = trpc.social.listInbox.useQuery(undefined, { enabled: folder === "inbox" || folder === "read" });
  const sent = trpc.social.listSent.useQuery(undefined, { enabled: folder === "sent" || folder === "read" });

  const sendMail = trpc.social.sendMail.useMutation({
    onSuccess: () => {
      setToEmail("");
      setSubject("");
      setBody("");
      setFolder("sent");
      void utils.social.listSent.invalidate();
      void utils.social.listInbox.invalidate();
      void utils.social.dashboard.invalidate();
    },
  });

  const markRead = trpc.social.markMailRead.useMutation({
    onSuccess: () => {
      void utils.social.listInbox.invalidate();
      void utils.social.dashboard.invalidate();
    },
  });

  const [gradStart, gradEnd] = brandGradientPair(colors);
  const highlight = brandHighlightSurface(colors);

  const openMail = (mail: MailItem) => {
    setSelected(mail);
    setFolder("read");
    if (mail.recipientUserId === myUserId && !mail.readAt) {
      markRead.mutate({ messageId: mail.id });
    }
  };

  const list = folder === "sent" ? (sent.data ?? []) : (inbox.data ?? []);
  const unreadInbox = useMemo(
    () => (inbox.data ?? []).filter((m) => !m.readAt).length,
    [inbox.data],
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[withAlpha(gradStart, 0.12), withAlpha(gradEnd, 0.08)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.centerBanner, { borderColor: withAlpha(colors.secondary, 0.2) }]}
      >
        <IconSymbol name="envelope.fill" size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.centerTitle, { color: colors.foreground }]}>UR Internet Center</Text>
          <Text style={[styles.centerSub, { color: colors.muted }]}>
            Signed in as {myEmail || "your account"} · Internal UR mail only
          </Text>
        </View>
      </LinearGradient>

      <View style={[styles.folderBar, highlight]}>
        <FolderTab
          label="Inbox"
          active={folder === "inbox" || (folder === "read" && selected && selected.recipientUserId === myUserId)}
          onPress={() => {
            setSelected(null);
            setFolder("inbox");
          }}
          badge={unreadInbox}
          colors={colors}
          grad={[gradStart, gradEnd]}
        />
        <FolderTab
          label="Sent"
          active={folder === "sent" || (folder === "read" && selected && selected.senderUserId === myUserId)}
          onPress={() => {
            setSelected(null);
            setFolder("sent");
          }}
          colors={colors}
          grad={[gradStart, gradEnd]}
        />
        <FolderTab
          label="Compose"
          active={folder === "compose"}
          onPress={() => {
            setSelected(null);
            setFolder("compose");
          }}
          colors={colors}
          grad={[gradStart, gradEnd]}
        />
      </View>

      {folder === "compose" ? (
        <ScrollView contentContainerStyle={styles.composeScroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>To</Text>
          <TextInput
            value={toEmail}
            onChangeText={setToEmail}
            placeholder="member@email.com"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[styles.field, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
          />
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Subject</Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="What's this about?"
            placeholderTextColor={colors.muted}
            style={[styles.field, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
          />
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Message</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Write your message…"
            placeholderTextColor={colors.muted}
            multiline
            textAlignVertical="top"
            style={[
              styles.bodyField,
              { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background },
            ]}
          />
          <Pressable
            disabled={!toEmail.includes("@") || !subject.trim() || !body.trim() || sendMail.isPending}
            onPress={() =>
              sendMail.mutate({
                toEmail: toEmail.trim(),
                subject: subject.trim(),
                body: body.trim(),
              })
            }
            style={[styles.sendBtn, { opacity: sendMail.isPending ? 0.6 : 1 }]}
          >
            <LinearGradient colors={[gradStart, gradEnd]} style={styles.sendBtnInner}>
              <Text style={styles.sendBtnText}>{sendMail.isPending ? "Sending…" : "Send mail"}</Text>
            </LinearGradient>
          </Pressable>
          {sendMail.error ? (
            <Text style={{ color: colors.error, fontSize: 12, marginTop: 8 }}>{sendMail.error.message}</Text>
          ) : null}
          <Text style={[styles.hint, { color: colors.muted }]}>
            Email any UR member who has signed up. They will see it in their Internet Center inbox.
          </Text>
        </ScrollView>
      ) : folder === "read" && selected ? (
        <ScrollView contentContainerStyle={styles.readScroll}>
          <Pressable
            onPress={() => {
              setSelected(null);
              setFolder(selected.recipientUserId === myUserId ? "inbox" : "sent");
            }}
            style={styles.backRow}
          >
            <IconSymbol name="chevron.left" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: "600" }}>Back to mailbox</Text>
          </Pressable>
          <View style={[styles.readCard, { borderColor: withAlpha(colors.secondary, 0.2), backgroundColor: colors.surface }]}>
            <Text style={[styles.readSubject, { color: colors.foreground }]}>
              {selected.subject ?? "Message from UR Internet Center"}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: colors.muted }]}>From</Text>
              <Text style={{ color: colors.foreground, fontSize: 13, flex: 1 }}>
                {selected.senderEmail ?? selected.senderUserId.slice(0, 8)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: colors.muted }]}>To</Text>
              <Text style={{ color: colors.foreground, fontSize: 13, flex: 1 }}>
                {selected.recipientEmail ?? selected.recipientUserId.slice(0, 8)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: colors.muted }]}>Date</Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                {new Date(selected.createdAt).toLocaleString()}
              </Text>
            </View>
            <View style={[styles.bodyDivider, { borderTopColor: withAlpha(colors.secondary, 0.15) }]} />
            <Text style={[styles.readBody, { color: colors.foreground }]}>{selected.body}</Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.listScroll}>
          {(folder === "inbox" ? inbox.isLoading : sent.isLoading) ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : list.length === 0 ? (
            <View style={[styles.empty, highlight]}>
              <IconSymbol name="envelope.fill" size={32} color={colors.primary} />
              <Text style={{ color: colors.foreground, fontWeight: "700", marginTop: 10 }}>
                {folder === "inbox" ? "Inbox is empty" : "No sent mail yet"}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 6, lineHeight: 18 }}>
                {folder === "inbox"
                  ? "When other UR members email you, messages appear here."
                  : "Tap Compose to send mail to any UR member by email address."}
              </Text>
              {folder === "inbox" ? (
                <Pressable onPress={() => setFolder("compose")} style={{ marginTop: 12 }}>
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>Compose mail →</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            list.map((mail) => (
              <Pressable
                key={mail.id}
                onPress={() => openMail(mail as MailItem)}
                style={[
                  styles.mailRow,
                  {
                    backgroundColor: !mail.readAt && mail.recipientUserId === myUserId
                      ? withAlpha(colors.primary, 0.08)
                      : colors.surface,
                    borderColor: withAlpha(colors.secondary, 0.15),
                  },
                ]}
              >
                <View style={styles.mailRowTop}>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontWeight: !mail.readAt && mail.recipientUserId === myUserId ? "800" : "600",
                      flex: 1,
                      fontSize: 13,
                    }}
                    numberOfLines={1}
                  >
                    {mail.subject ?? "Message from UR Internet Center"}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 10 }}>{formatMailDate(mail.createdAt)}</Text>
                </View>
                <Text style={{ color: colors.primary, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                  {folder === "inbox"
                    ? `From: ${mail.senderEmail ?? "UR member"}`
                    : `To: ${mail.recipientEmail ?? "UR member"}`}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }} numberOfLines={2}>
                  {mail.body}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function FolderTab({
  label,
  active,
  onPress,
  badge,
  colors,
  grad,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  badge?: number;
  colors: ReturnType<typeof useColors>;
  grad: [string, string];
}) {
  return (
    <Pressable onPress={onPress} style={styles.folderTab}>
      {active ? (
        <LinearGradient colors={grad} style={styles.folderTabInner}>
          <Text style={styles.folderTabTextActive}>{label}</Text>
          {badge && badge > 0 ? (
            <View style={styles.folderBadge}>
              <Text style={styles.folderBadgeText}>{badge > 9 ? "9+" : badge}</Text>
            </View>
          ) : null}
        </LinearGradient>
      ) : (
        <View style={styles.folderTabInner}>
          <Text style={[styles.folderTabText, { color: colors.foreground }]}>{label}</Text>
          {badge && badge > 0 ? (
            <View style={[styles.folderBadge, { backgroundColor: colors.secondary }]}>
              <Text style={styles.folderBadgeText}>{badge > 9 ? "9+" : badge}</Text>
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  centerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 12,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  centerTitle: { fontSize: 15, fontWeight: "800" },
  centerSub: { fontSize: 10, marginTop: 2, lineHeight: 14 },
  folderBar: {
    flexDirection: "row",
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  folderTab: { flex: 1 },
  folderTabInner: {
    borderRadius: 9,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  folderTabText: { fontSize: 12, fontWeight: "600" },
  folderTabTextActive: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  folderBadge: {
    backgroundColor: "#FFFFFF",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  folderBadgeText: { fontSize: 9, fontWeight: "800", color: "#4F46E5" },
  listScroll: { padding: 12, paddingBottom: 32, gap: 8 },
  mailRow: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  mailRowTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  empty: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    alignItems: "center",
    marginTop: 8,
  },
  composeScroll: { padding: 16, paddingBottom: 32, gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: "600", marginTop: 8, marginBottom: 4 },
  field: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  bodyField: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 160,
  },
  sendBtn: { marginTop: 16, borderRadius: 12, overflow: "hidden" },
  sendBtnInner: { paddingVertical: 14, alignItems: "center" },
  sendBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  hint: { fontSize: 11, lineHeight: 16, marginTop: 12, textAlign: "center" },
  readScroll: { padding: 16, paddingBottom: 32 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 },
  readCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  readSubject: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  metaLabel: { width: 36, fontSize: 11, fontWeight: "600" },
  bodyDivider: { borderTopWidth: StyleSheet.hairlineWidth, marginVertical: 14 },
  readBody: { fontSize: 15, lineHeight: 22 },
});
