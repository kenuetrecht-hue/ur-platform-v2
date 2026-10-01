import { Text, View } from "react-native";
import { LETTERING_ON_WHITE } from "@/lib/gold-lettering";

type Offer = { label: string; count: number; cents: number };
type PostRow = { id: string; text: string; likes: number; comments: number };
type RosterRow = { displayName: string; linkOpens: number; salesCount: number; salesCents: number };

export type CreatorSalesDeskData = {
  days: number;
  linkOpens: number;
  salesCount: number;
  salesCents: number;
  conversionPercent: number | null;
  advice: string;
  offers: Offer[];
  posts: PostRow[];
  roster: RosterRow[] | null;
};

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function CreatorSalesDeskPanel({ desk }: { desk: CreatorSalesDeskData }) {
  return (
    <View
      testID="creator-sales-desk"
      style={{ backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E0E7FF", padding: 14, gap: 8 }}
    >
      <Text style={{ color: LETTERING_ON_WHITE, fontWeight: "800", fontSize: 16 }}>Sales desk</Text>
      <Text style={{ color: LETTERING_ON_WHITE, fontSize: 13, lineHeight: 18 }}>
        Last {desk.days} days. Free. You keep 85% of classes and calls and 100% of tips.
      </Text>
      <Text style={{ color: LETTERING_ON_WHITE, fontSize: 14, fontWeight: "700" }}>
        {desk.linkOpens} people opened your link · {desk.salesCount} sales · {money(desk.salesCents)}
        {desk.conversionPercent != null ? ` · ${desk.conversionPercent}% of those opens paid` : ""}
      </Text>
      <Text style={{ color: LETTERING_ON_WHITE, fontSize: 13, lineHeight: 18 }}>{desk.advice}</Text>
      {desk.offers.map((offer) => (
        <Text key={offer.label} style={{ color: LETTERING_ON_WHITE, fontSize: 13 }}>
          {offer.label}: {offer.count} · {money(offer.cents)}
        </Text>
      ))}
      {desk.posts.map((post) => (
        <Text key={post.id} style={{ color: LETTERING_ON_WHITE, fontSize: 13 }}>
          {post.likes} likes · {post.comments} comments · {post.text}
        </Text>
      ))}
      {desk.roster && desk.roster.length > 0 ? (
        <View style={{ gap: 4, marginTop: 6 }}>
          <Text style={{ color: LETTERING_ON_WHITE, fontWeight: "800", fontSize: 14 }}>Creators this week</Text>
          {desk.roster.map((row) => (
            <Text key={`${row.displayName}-${row.linkOpens}-${row.salesCents}`} style={{ color: LETTERING_ON_WHITE, fontSize: 13 }}>
              {row.displayName}: {row.linkOpens} opens · {row.salesCount} sales · {money(row.salesCents)}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
