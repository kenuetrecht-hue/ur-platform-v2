import { View, Text, Pressable, Share, Linking, Alert, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

type SharePayload = {
  url: string;
  shareText: string;
  facebookShareUrl?: string;
  label?: string;
};

export function CreatorSocialShareBar({
  payload,
  compact = false,
}: {
  payload: SharePayload;
  compact?: boolean;
}) {
  const colors = useColors();

  const handleNativeShare = async () => {
    try {
      await Share.share({
        message: `${payload.shareText}\n\n${payload.url}`,
        url: payload.url,
        title: payload.label ?? "Share on UR Platform",
      });
    } catch {
      /* user dismissed */
    }
  };

  const handleFacebook = async () => {
    const fbUrl =
      payload.facebookShareUrl ??
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(payload.url)}`;
    const canOpen = await Linking.canOpenURL(fbUrl);
    if (canOpen) {
      await Linking.openURL(fbUrl);
    } else {
      Alert.alert("Facebook", "Could not open Facebook. Use Share instead.");
    }
  };

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <Pressable
        onPress={handleFacebook}
        style={[styles.btn, { backgroundColor: "#1877F2" }]}
      >
        <Text style={styles.btnText}>Facebook</Text>
      </Pressable>
      <Pressable
        onPress={() => void handleNativeShare()}
        style={[styles.btn, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.btnText}>Share</Text>
      </Pressable>
    </View>
  );
}

export function CreatorPromoCard({
  shareText,
  facebookPost,
  customUrl,
  facebookShareUrl,
  label = "Promote your classes",
}: {
  shareText: string;
  facebookPost: string;
  customUrl: string;
  facebookShareUrl: string;
  label?: string;
}) {
  const colors = useColors();

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15 }}>{label}</Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        Share your creator link or post a Facebook promo. ContentMate can also write custom captions
        for you in the AI tab.
      </Text>
      <Text
        selectable
        style={{
          color: colors.foreground,
          fontSize: 12,
          lineHeight: 18,
          backgroundColor: colors.background,
          padding: 12,
          borderRadius: 10,
        }}
      >
        {facebookPost}
      </Text>
      <CreatorSocialShareBar
        payload={{ url: customUrl, shareText, facebookShareUrl }}
      />
      <Text style={{ color: colors.muted, fontSize: 11 }}>Long-press the text above to copy.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  rowCompact: { marginTop: 4 },
  btn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
});
