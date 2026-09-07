import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { createVoicePromptSession } from "@/lib/record-voice-prompt";

type Props = {
  onTranscript: (text: string, hint: string) => void;
  disabled?: boolean;
  labeled?: boolean;
  /** Stop AI playback before the mic opens so it does not hear itself. */
  onBeforeListen?: () => void;
};

export function VoicePromptMicButton({
  onTranscript,
  disabled,
  labeled = false,
  onBeforeListen,
}: Props) {
  const colors = useColors();
  const [listening, setListening] = useState(false);
  const sessionRef = useRef<ReturnType<typeof createVoicePromptSession> | null>(null);
  const transcribe = trpc.aiCreators.transcribeVoicePrompt.useMutation();

  const toggle = async () => {
    if (disabled) return;
    if (listening && sessionRef.current) {
      try {
        const clip = await sessionRef.current.stop();
        sessionRef.current = null;
        setListening(false);
        const result = await transcribe.mutateAsync(clip);
        const hint = result.translated
          ? `Heard ${result.language} — printed in English`
          : `Heard ${result.language}`;
        onTranscript(result.printedText, hint);
      } catch {
        sessionRef.current = null;
        setListening(false);
        onTranscript("", "Could not hear that. Tap the microphone and speak again.");
      }
      return;
    }
    try {
      onBeforeListen?.();
      const session = createVoicePromptSession();
      sessionRef.current = session;
      setListening(true);
      onTranscript("", "Listening… tap the microphone again when you finish.");
      await session.ready;
    } catch {
      sessionRef.current = null;
      setListening(false);
      onTranscript("", "Allow the microphone in this browser, then try again.");
    }
  };

  return (
    <Pressable
      onPress={() => void toggle()}
      disabled={disabled || transcribe.isPending}
      accessibilityLabel={listening ? "Stop talking" : "Talk — speak any language"}
      hitSlop={8}
      style={{
        minWidth: labeled ? 72 : 40,
        height: 40,
        paddingHorizontal: labeled ? 8 : 0,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: listening ? "#dc2626" : colors.border,
        backgroundColor: listening ? "#dc2626" : colors.surface,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 4,
      }}
    >
      {transcribe.isPending ? (
        <ActivityIndicator color={listening ? "#fff" : colors.primary} size="small" />
      ) : (
        <>
          <Text style={{ fontSize: 18 }}>{listening ? "■" : "🎤"}</Text>
          {labeled ? (
            <Text style={{ color: listening ? "#fff" : colors.foreground, fontSize: 11, fontWeight: "800" }}>
              {listening ? "Stop" : "Talk"}
            </Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
}
