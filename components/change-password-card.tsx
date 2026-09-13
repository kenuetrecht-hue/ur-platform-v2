import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { changeOwnPassword, savePasswordRemindDays } from "@/lib/change-own-password";
import { explainAuthFailure } from "@/lib/auth-network-error";
import {
  PASSWORD_REMIND_DAY_CHOICES,
  passwordRemindCopy,
  type PasswordRemindDays,
} from "@/lib/password-hygiene";
import { PrimaryActionButton } from "@/components/primary-action-button";

/** Every member can change their password any day, and pick a 30 / 60 / 90 day reminder. */
export function ChangePasswordCard(props: { initialRemindDays?: PasswordRemindDays }) {
  const colors = useColors();
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [remindDays, setRemindDays] = useState<PasswordRemindDays>(props.initialRemindDays ?? 90);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const inputStyle = {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: colors.foreground,
  };

  const onSave = () => {
    setError(null);
    setDone(null);
    setBusy(true);
    void (async () => {
      try {
        await changeOwnPassword({
          currentPassword,
          nextPassword,
          confirmPassword,
          remindDays,
        });
        setCurrentPassword("");
        setNextPassword("");
        setConfirmPassword("");
        setDone("Password saved. Use the new one next time you Login.");
      } catch (err) {
        setError(explainAuthFailure(err));
      } finally {
        setBusy(false);
      }
    })();
  };

  const onPickDays = (days: PasswordRemindDays) => {
    setRemindDays(days);
    void savePasswordRemindDays(days).catch((err) => setError(explainAuthFailure(err)));
  };

  return (
    <View
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: 16,
        gap: 10,
      }}
      testID="change-password-card"
    >
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>
        Change password
      </Text>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
        Anyone can do this any day to keep their account safe. Type the password you use now, then a
        new one twice.
      </Text>
      <Text style={{ color: colors.foreground, fontWeight: "600" }}>Current password</Text>
      <TextInput
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry={!showPassword}
        maxLength={128}
        placeholder="The password you Login with now"
        placeholderTextColor={colors.muted}
        style={inputStyle}
        testID="change-password-current"
      />
      <Text style={{ color: colors.foreground, fontWeight: "600" }}>New password</Text>
      <TextInput
        value={nextPassword}
        onChangeText={setNextPassword}
        secureTextEntry={!showPassword}
        maxLength={128}
        placeholder="At least 6 characters"
        placeholderTextColor={colors.muted}
        style={inputStyle}
        testID="change-password-next"
      />
      <Text style={{ color: colors.foreground, fontWeight: "600" }}>Type the new password again</Text>
      <TextInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={!showPassword}
        maxLength={128}
        placeholder="Same as the new password"
        placeholderTextColor={colors.muted}
        style={inputStyle}
        testID="change-password-confirm"
      />
      <Text
        onPress={() => setShowPassword((value) => !value)}
        style={{ color: colors.primary, fontWeight: "800" }}
      >
        {showPassword ? "Hide password" : "Show password"}
      </Text>
      <Text style={{ color: colors.foreground, fontWeight: "700" }}>Remind me to change it</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {PASSWORD_REMIND_DAY_CHOICES.map((days) => (
          <Pressable
            key={days}
            onPress={() => onPickDays(days)}
            style={{
              borderWidth: 1,
              borderColor: remindDays === days ? colors.primary : colors.border,
              backgroundColor: remindDays === days ? `${colors.primary}15` : colors.background,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
            testID={`password-remind-${days}`}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>
              Every {days} days
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => onPickDays(0)}
          style={{
            borderWidth: 1,
            borderColor: remindDays === 0 ? colors.primary : colors.border,
            backgroundColor: remindDays === 0 ? `${colors.primary}15` : colors.background,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
          testID="password-remind-off"
        >
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>
            Only when I want
          </Text>
        </Pressable>
      </View>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        {passwordRemindCopy(remindDays)}
      </Text>
      {error ? <Text style={{ color: "#c0392b", fontSize: 13 }}>{error}</Text> : null}
      {done ? <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "700" }}>{done}</Text> : null}
      <PrimaryActionButton
        label="Save new password"
        loadingLabel="Saving…"
        loading={busy}
        onPress={onSave}
        backgroundColor={colors.primary}
        testID="save-own-password"
      />
    </View>
  );
}
