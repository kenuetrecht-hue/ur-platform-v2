export function TierBadge({ tier, size = "sm" }: { tier?: TierName; size?: "sm" | "md" | "lg" }) {
  const colors = useColors();
  // Safe fallback - if tier is missing, use Bronze
  const safeTier = tier && TIERS[tier] ? tier : "Bronze";
  const tierData = TIERS[safeTier];
  const tierColor = tierData?.color || "#CD7F32";
  const fontSize = size === "lg" ? 14 : size === "md" ? 12 : 10;
  const padH = size === "lg" ? 12 : size === "md" ? 10 : 8;
  const padV = size === "lg" ? 6 : size === "md" ? 4 : 3;

  return (
    <View
      style={{
        backgroundColor: tierColor + "30",
        borderColor: tierColor,
        borderWidth: 1,
        paddingHorizontal: padH,
        paddingVertical: padV,
        borderRadius: 999,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
      }}
    >
      <IconSymbol name="crown.fill" size={fontSize} color={tierColor} />
      <Text style={{ color: colors.foreground, fontSize, fontWeight: "600" }}>{safeTier}</Text>
    </View>
  );
}
