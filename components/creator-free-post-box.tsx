import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { CREATOR_FREE_CONTENT_POST_NOTICE } from "@/lib/creator-free-content-policy";

export function CreatorFreePostBox() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const [body, setBody] = useState("");
  const [rights, setRights] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const post = trpc.social.createPost.useMutation({
    onSuccess: () => {
      setBody("");
      setRights(false);
      setNote("Posted. Basic members can read it on the home page and in the free feed.");
      void utils.social.feed.invalidate();
    },
  });

  const canPost = body.trim().length > 0 && rights && !post.isPending;

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Post free content</Text>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
        {CREATOR_FREE_CONTENT_POST_NOTICE} This box posts for everyone. To keep a post with friends and
        followers only, open the free feed and choose Friends and followers.
      </Text>
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Write a free post for everyone to read"
        placeholderTextColor={colors.muted}
        multiline
        maxLength={4000}
        style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
      />
      <Pressable
        onPress={() => setRights((value) => !value)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: rights }}
        style={styles.checkRow}
      >
        <View
          style={[
            styles.box,
            {
              borderColor: rights ? colors.primary : colors.border,
              backgroundColor: rights ? colors.primary : colors.background,
            },
          ]}
        >
          {rights ? <Text style={styles.check}>✓</Text> : null}
        </View>
        <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 17, flex: 1 }}>
          This is my own content, and I am posting it free for everyone.
        </Text>
      </Pressable>
      <Pressable
        disabled={!canPost}
        onPress={() =>
          post.mutate({
            body: body.trim(),
            visibility: "public",
            contentRightsMode: "original",
            rightsConfirmed: true,
          })
        }
        style={[styles.btn, { backgroundColor: colors.primary, opacity: canPost ? 1 : 0.5 }]}
      >
        {post.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Post for free</Text>
        )}
      </Pressable>
      {note ? <Text style={{ color: colors.primary, fontSize: 12 }}>{note}</Text> : null}
      {post.error ? <Text style={styles.error}>{post.error.message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  title: { fontWeight: "800", fontSize: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 88,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: "top",
  },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  box: { width: 22, height: 22, borderRadius: 4, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  check: { color: "#fff", fontSize: 14, fontWeight: "800" },
  btn: { borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  error: { color: "#e74c3c", fontSize: 12 },
});
