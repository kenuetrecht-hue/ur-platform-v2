import { ActivityIndicator, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { LETTERING_ON_WHITE } from "@/lib/gold-lettering";
import { trpc } from "@/lib/trpc";

function Count({ label, value }: { label: string; value: number }) {
  return (
    <View
      style={{
        minWidth: 108,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E0E7FF",
      }}
    >
      <Text style={{ color: LETTERING_ON_WHITE, fontSize: 20, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: LETTERING_ON_WHITE, fontSize: 12, lineHeight: 16 }}>{label}</Text>
    </View>
  );
}

/** Owner only. Who came to the site, which buttons they pressed, and where they stopped. */
export function VisitorTrailPanel() {
  const colors = useColors();
  const report = trpc.visitorTrail.report.useQuery(undefined, { refetchInterval: 20_000 });

  if (report.isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ margin: 16 }} />;
  }

  const data = report.data;

  return (
    <View
      testID="visitor-trail-panel"
      style={{
        marginHorizontal: 12,
        marginBottom: 12,
        padding: 12,
        borderRadius: 14,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E0E7FF",
        gap: 8,
      }}
    >
      <Text style={{ color: LETTERING_ON_WHITE, fontWeight: "800", fontSize: 16 }}>
        Who came to the website
      </Text>
      <Text style={{ color: LETTERING_ON_WHITE, fontSize: 13, lineHeight: 18 }}>
        Pages they opened, buttons they pressed, and how long they stayed. This does not save
        passwords, chat messages, or anything they type. Your own visits are left out.
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Count label="People today" value={data?.todayVisitors ?? 0} />
        <Count label="Today, not signed up" value={data?.todayUnsigned ?? 0} />
        <Count label="People this week" value={data?.weekVisitors ?? 0} />
        <Count label="Week, not signed up" value={data?.weekUnsigned ?? 0} />
        <Count label="Signed up this week" value={data?.weekSignedUp ?? 0} />
      </View>

      <Text style={{ color: LETTERING_ON_WHITE, fontWeight: "700", fontSize: 14 }}>
        Where people stopped
      </Text>
      {(data?.stoppedOn.length ?? 0) === 0 ? (
        <Text style={{ color: LETTERING_ON_WHITE, fontSize: 13 }}>
          No visitors yet. Counts start after this update is on the live site.
        </Text>
      ) : (
        data?.stoppedOn.map((row) => (
          <Text key={row.path} style={{ color: LETTERING_ON_WHITE, fontSize: 13, lineHeight: 18 }}>
            {row.people} stopped on {row.path}
          </Text>
        ))
      )}

      <Text style={{ color: LETTERING_ON_WHITE, fontWeight: "700", fontSize: 14 }}>
        Pages where they slowed down
      </Text>
      {(data?.slowPages.length ?? 0) === 0 ? (
        <Text style={{ color: LETTERING_ON_WHITE, fontSize: 13 }}>No long pauses yet.</Text>
      ) : (
        data?.slowPages.map((row) => (
          <Text key={`slow-${row.path}`} style={{ color: LETTERING_ON_WHITE, fontSize: 13, lineHeight: 18 }}>
            {row.path} — about {row.averageSeconds} seconds, {row.visits} visit{row.visits === 1 ? "" : "s"}
          </Text>
        ))
      )}

      <Text style={{ color: LETTERING_ON_WHITE, fontWeight: "700", fontSize: 14 }}>Buttons they pressed</Text>
      {(data?.topButtons.length ?? 0) === 0 ? (
        <Text style={{ color: LETTERING_ON_WHITE, fontSize: 13 }}>No button presses yet.</Text>
      ) : (
        data?.topButtons.map((row) => (
          <Text
            key={`${row.path}-${row.label}`}
            style={{ color: LETTERING_ON_WHITE, fontSize: 13, lineHeight: 18 }}
          >
            {row.presses}× {row.label} on {row.path}
          </Text>
        ))
      )}

      <Text style={{ color: LETTERING_ON_WHITE, fontWeight: "700", fontSize: 14 }}>Recent visits</Text>
      {data?.recent.map((person) => (
        <Text
          key={`${person.visitorLabel}-${person.lastSeenLabel}`}
          style={{ color: LETTERING_ON_WHITE, fontSize: 13, lineHeight: 18 }}
        >
          {person.visitorLabel} · {person.signedUp ? "signed up" : "did not sign up"} · {person.lastSeenLabel}
          {"\n"}
          {person.journey || `${person.firstPath} → ${person.lastPath}`}
        </Text>
      ))}
    </View>
  );
}
