import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { createVoicePromptSession } from "@/lib/record-voice-prompt";

type Props = {
  onTranscript: (text: string, hint: string) => void;
  disabled?: boolean;
};

export function VoicePromptMicButton({ onTranscript, disabled }: Props) {
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
      accessibilityLabel={listening ? "Stop microphone" : "Speak any language"}
      hitSlop={8}
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: listening ? "#dc2626" : colors.border,
        backgroundColor: listening ? "#dc2626" : colors.surface,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {transcribe.isPending ? (
        <ActivityIndicator color={listening ? "#fff" : colors.primary} size="small" />
      ) : (
        <Text style={{ fontSize: 18 }}>{listening ? "■" : "🎤"}</Text>
      )}
    </Pressable>
  );
}
