import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { createVoicePromptSession } from "@/lib/record-voice-prompt";
import { stopExclusiveAudio } from "@/lib/exclusive-audio-player";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  sendLabel?: string;
  onSend?: () => void;
  sending?: boolean;
};

export function VoicePromptField({
  value,
  onChangeText,
  placeholder = "Type here, or tap the microphone and speak any language",
  disabled,
  maxLength = 2000,
  sendLabel = "Send",
  onSend,
  sending,
}: Props) {
  const colors = useColors();
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const sessionRef = useRef<ReturnType<typeof createVoicePromptSession> | null>(null);
  const transcribe = trpc.aiCreators.transcribeVoicePrompt.useMutation();
  const sendDisabled = disabled || sending || listening || !value.trim();

  const toggleMic = async () => {
    if (disabled || sending) return;
    if (listening && sessionRef.current) {
      try {
        const clip = await sessionRef.current.stop();
        sessionRef.current = null;
        setListening(false);
        const result = await transcribe.mutateAsync(clip);
        onChangeText(result.printedText.slice(0, maxLength));
        setHint(
          result.translated
            ? `Heard ${result.language} — printed in English`
            : `Heard ${result.language}`,
        );
      } catch {
        sessionRef.current = null;
        setListening(false);
        setHint("Could not hear that. Tap the microphone and speak again.");
      }
      return;
    }
    try {
      stopExclusiveAudio();
      setHint("Listening… tap the microphone again when you finish.");
      const session = createVoicePromptSession();
      sessionRef.current = session;
      setListening(true);
      await session.ready;
    } catch {
      sessionRef.current = null;
      setListening(false);
      setHint("Allow the microphone in this browser, then try again.");
    }
  };

  return (
    <View style={{ gap: 10, width: "100%", position: "relative", zIndex: 1 }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline
        maxLength={maxLength}
        editable={!disabled && !listening && !sending}
        style={{
          width: "100%",
          minHeight: 96,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          color: colors.foreground,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 15,
          textAlignVertical: "top",
        }}
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          width: "100%",
          zIndex: 2,
        }}
      >
        <Pressable
          onPress={() => void toggleMic()}
          disabled={disabled || sending || transcribe.isPending}
          accessibilityRole="button"
          accessibilityLabel={listening ? "Stop microphone" : "Speak any language"}
          style={{
            width: 52,
            height: 48,
            flexShrink: 0,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: listening ? "#dc2626" : colors.primary,
          }}
        >
          {transcribe.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontSize: 22 }}>{listening ? "■" : "🎤"}</Text>
          )}
        </Pressable>
        {onSend ? (
          <Pressable
            onPress={() => {
              if (sendDisabled) return;
              onSend();
            }}
            disabled={sendDisabled}
            accessibilityRole="button"
            accessibilityLabel={sendLabel}
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: sendDisabled ? colors.muted : colors.primary,
            }}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>{sendLabel}</Text>
            )}
          </Pressable>
        ) : null}
      </View>
      {hint ? (
        <Text style={{ color: listening ? "#dc2626" : colors.muted, fontSize: 12 }}>{hint}</Text>
      ) : (
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Type in the box, or tap the microphone and speak any language. We print it here in English
          if needed. Then tap {sendLabel}.
        </Text>
      )}
    </View>
  );
}
