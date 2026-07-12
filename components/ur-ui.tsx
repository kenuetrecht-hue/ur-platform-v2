import { View, Text, Pressable, Image, StyleProp, ViewStyle, ActivityIndicator , Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { TierName, TIERS } from "@/lib/store";
import * as Haptics from "expo-haptics";

// ============ Avatar ============

export function Avatar({ uri, size = 48, ring }: { uri: string; size?: number; ring?: boolean }) {
  const colors = useColors();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: ring ? 2 : 0,
        borderColor: ring ? colors.primary : "transparent",
        padding: ring ? 2 : 0,
      }}
    >
      <Image
        source={{ uri }}
        style={{
          width: ring ? size - 4 : size,
          height: ring ? size - 4 : size,
          borderRadius: (ring ? size - 4 : size) / 2,
          backgroundColor: colors.surface,
        }}
      />
    </View>
  );
}

// ============ Tier Badge ============

export function TierBadge({ tier, size = "sm" }: { tier: TierName; size?: "sm" | "md" | "lg" }) {
  const colors = useColors();
  const tierColor = TIERS[tier].color;
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
      <Text style={{ color: colors.foreground, fontSize, fontWeight: "600" }}>{tier}</Text>
    </View>
  );
}

// ============ Verified Badge ============

export function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <View
      style={{
        backgroundColor: "#1DA1F2",
        width: size + 4,
        height: size + 4,
        borderRadius: (size + 4) / 2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <IconSymbol name="checkmark" size={size - 2} color="#FFFFFF" />
    </View>
  );
}

// ============ Primary Button (gradient) ============

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: any;
  style?: StyleProp<ViewStyle>;
  size?: "sm" | "md" | "lg";
}

export function PrimaryButton({ title, onPress, loading, disabled, icon, style, size = "md" }: PrimaryButtonProps) {
  const padV = size === "lg" ? 16 : size === "md" ? 14 : 10;
  const fontSize = size === "lg" ? 17 : size === "md" ? 16 : 14;

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          transform: pressed ? [{ scale: 0.98 }] : [],
          borderRadius: 14,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <LinearGradient
        colors={["#6366F1", "#8B5CF6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingVertical: padV,
          paddingHorizontal: 24,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            {icon && <IconSymbol name={icon} size={fontSize + 2} color="#FFFFFF" />}
            <Text style={{ color: "#FFFFFF", fontSize, fontWeight: "600" }}>{title}</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

// ============ Secondary Button ============

export function SecondaryButton({ title, onPress, icon, style, size = "md" }: PrimaryButtonProps) {
  const colors = useColors();
  const padV = size === "lg" ? 16 : size === "md" ? 14 : 10;
  const fontSize = size === "lg" ? 17 : size === "md" ? 16 : 14;

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          paddingVertical: padV,
          paddingHorizontal: 24,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {icon && <IconSymbol name={icon} size={fontSize + 2} color={colors.foreground} />}
      <Text style={{ color: colors.foreground, fontSize, fontWeight: "600" }}>{title}</Text>
    </Pressable>
  );
}

// ============ Card ============

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const colors = useColors();
  const cardStyle = {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [cardStyle, { opacity: pressed ? 0.7 : 1 }, style]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}

// ============ Section Header ============

export function SectionHeader({ title, action, onActionPress }: { title: string; action?: string; onActionPress?: () => void }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4, marginBottom: 12 }}>
      <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "700" }}>{title}</Text>
      {action && (
        <Pressable onPress={onActionPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ============ Stat Card ============

export function StatCard({ label, value, icon, color }: { label: string; value: string; icon?: any; color?: string }) {
  const colors = useColors();
  return (
    <Card style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {icon && <IconSymbol name={icon} size={18} color={color || colors.primary} />}
        <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "500" }}>{label}</Text>
      </View>
      <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "700" }}>{value}</Text>
    </Card>
  );
}

// ============ Empty State ============

export function EmptyState({ icon, title, message }: { icon: any; title: string; message: string }) {
  const colors = useColors();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconSymbol name={icon} size={32} color={colors.muted} />
      </View>
      <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "600", textAlign: "center" }}>{title}</Text>
      <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 20 }}>{message}</Text>
    </View>
  );
}

// ============ Header Bar (with back) ============

export function HeaderBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
        gap: 12,
      }}
    >
      {onBack && (
        <Pressable onPress={onBack} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })} hitSlop={10}>
          <IconSymbol name="chevron.left" size={28} color={colors.foreground} />
        </Pressable>
      )}
      <Text style={{ flex: 1, color: colors.foreground, fontSize: 18, fontWeight: "600" }}>{title}</Text>
      {right}
    </View>
  );
}

// ============ Brand Logo Mark ============

export function URMark({ size = 64 }: { size?: number }) {
  return (
    <LinearGradient
      colors={["#6366F1", "#8B5CF6"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#FFFFFF", fontSize: size * 0.45, fontWeight: "800", letterSpacing: -1 }}>UR</Text>
    </LinearGradient>
  );
}
