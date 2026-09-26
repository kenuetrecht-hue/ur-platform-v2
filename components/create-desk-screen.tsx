import type { ReactNode } from "react";
import { ScrollView, Text, TextInput, View, type TextStyle, type ViewStyle } from "react-native";
import { Stack } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { PrimaryActionButton } from "@/components/primary-action-button";
import { AppPressable } from "@/components/app-pressable";
import { useColors } from "@/hooks/use-colors";
import { LETTERING_ON_COLOR, LETTERING_ON_WHITE } from "@/lib/gold-lettering";

const FIELD: TextStyle = {
  backgroundColor: "#FFFFFF",
  color: LETTERING_ON_WHITE,
  borderRadius: 12,
  borderWidth: 1,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 15,
};

export function CreateDeskScreen({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, title }} />
      <ScreenContainer>
        <TabScreenHeader icon={icon} title={title} subtitle={subtitle} />
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 36, gap: 12 }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

export function WashCopy({ children }: { children: string }) {
  return <Text style={{ color: LETTERING_ON_COLOR, fontSize: 14, lineHeight: 20 }}>{children}</Text>;
}

export function DeskField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  maxLength?: number;
}) {
  const colors = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: LETTERING_ON_COLOR, fontWeight: "700", fontSize: 13 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={LETTERING_ON_WHITE}
        multiline={multiline}
        maxLength={maxLength ?? (multiline ? 2000 : 80)}
        style={[FIELD, { borderColor: colors.border }, multiline ? { minHeight: 120, textAlignVertical: "top" } : null]}
      />
    </View>
  );
}

export function DeskPrimary({
  label,
  onPress,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  const colors = useColors();
  return (
    <PrimaryActionButton
      label={label}
      loading={loading}
      loadingLabel="Working…"
      onPress={onPress}
      backgroundColor={colors.primary}
    />
  );
}

export function DeskLink({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useColors();
  const style: ViewStyle = {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "transparent",
  };
  return (
    <AppPressable onPress={onPress} style={style}>
      <Text pointerEvents="none" style={{ color: LETTERING_ON_COLOR, fontWeight: "700", textAlign: "center" }}>
        {label}
      </Text>
    </AppPressable>
  );
}

export function DeskNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return <Text style={{ color: LETTERING_ON_COLOR, fontSize: 13 }}>{message}</Text>;
}
