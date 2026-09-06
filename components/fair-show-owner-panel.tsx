import { ActivityIndicator, Text, View, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export function FairShowOwnerPanel() {
  const colors = useColors();
  const board = trpc.fairShow.ownerBoard.useQuery();

  if (board.isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ margin: 16 }} />;
  }

  const data = board.data;
  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>UR Fair Show</Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        Same numbers creators see. No pay-to-rank. {data?.videoCount ?? 0} videos · {data?.creatorCount ?? 0}{" "}
        creators · {data?.uniqueViewers ?? 0} people who started a video.
      </Text>
      {(data?.starvedCreators ?? []).length > 0 ? (
        <>
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13, marginTop: 8 }}>
            Zero show time
          </Text>
          {data!.starvedCreators.map((row) => (
            <Text key={row.creatorId} style={{ color: colors.muted, fontSize: 12 }}>
              {row.displayName} · {row.videoCount} videos · 0 impressions
            </Text>
          ))}
        </>
      ) : (
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>
          No creator is sitting at zero impressions right now.
        </Text>
      )}
      {(data?.topFinishers ?? []).length > 0 ? (
        <>
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13, marginTop: 8 }}>
            People stayed on these
          </Text>
          {data!.topFinishers.map((row) => (
            <Text key={row.contentId} style={{ color: colors.muted, fontSize: 12 }}>
              {row.title} · {Math.round(row.averageCompletion * 100)}% finished
            </Text>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
});
