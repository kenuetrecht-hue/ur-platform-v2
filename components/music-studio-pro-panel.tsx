import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { BillingStatePicker } from "@/components/billing-state-picker";
import { NoRefundPurchaseAck } from "@/components/no-refund-purchase-ack";
import { PaymentChannelNotice } from "@/components/payment-channel-notice";
import { PurchaseSummaryCard } from "@/components/purchase-summary-card";
import { useColors } from "@/hooks/use-colors";
import { useBillingState } from "@/hooks/use-billing-state";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import { getClientPlatform } from "@/lib/web-checkout";
import {
  MUSIC_STUDIO_PRICING_SUMMARY,
  type MusicStudioPlanId,
} from "@/lib/music-studio-pricing";
import {
  MUSIC_TRACKS,
  clampFx,
  clampMixerPan,
  clampMixerVolume,
  type MusicFx,
  type MusicMixer,
  type MusicTrackId,
} from "@/lib/music-studio";
import { exportMusicStudioWav, playMusicChord } from "@/lib/music-studio-playback";
import type { MusicKeyId, MusicKitId, MusicPattern } from "@/lib/music-studio";

type Props = {
  title: string;
  bpm: number;
  kit: MusicKitId;
  keyName: MusicKeyId;
  pattern: MusicPattern;
  mixer: MusicMixer;
  fx: MusicFx;
  onMixerChange: (mixer: MusicMixer) => void;
  onFxChange: (fx: MusicFx) => void;
};

export function MusicStudioProPanel({
  title,
  bpm,
  kit,
  keyName,
  pattern,
  mixer,
  fx,
  onMixerChange,
  onFxChange,
}: Props) {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const { isPlatformOwner } = usePlatformOwner();
  const { stateCode, setStateCode, hasState } = useBillingState();
  const clientPlatform = getClientPlatform();
  const [planId, setPlanId] = useState<MusicStudioPlanId>("month");
  const [accepted, setAccepted] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const catalog = trpc.musicStudio.catalog.useQuery(undefined, { enabled: isAuthenticated });
  const quote = trpc.musicStudio.quote.useQuery(
    { planId, stateCode: stateCode ?? undefined },
    { enabled: isAuthenticated },
  );
  const utils = trpc.useUtils();
  const purchase = trpc.musicStudio.purchase.useMutation({
    onSuccess: (result) => {
      setNote(result.message);
      void utils.musicStudio.catalog.invalidate();
      void utils.musicStudio.status.invalidate();
    },
    onError: (error) => setNote(error.message),
  });
  const consumeExport = trpc.musicStudio.consumeExport.useMutation();
  const consumeVocal = trpc.musicStudio.consumeVocalTake.useMutation();

  const status = catalog.data?.status;
  const hasPro = Boolean(status?.hasPro || isPlatformOwner);

  const bump = (track: MusicTrackId, field: "volume" | "pan", delta: number) => {
    const ch = mixer[track];
    onMixerChange({
      ...mixer,
      [track]: {
        ...ch,
        [field]:
          field === "volume" ? clampMixerVolume(ch.volume + delta) : clampMixerPan(ch.pan + delta),
      },
    });
  };

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>UR Studio Pro</Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        {MUSIC_STUDIO_PRICING_SUMMARY} This is our mixer desk — not a license to Avid Pro Tools.
      </Text>

      {hasPro ? (
        <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>
          {status?.complimentary ? "Owner complimentary — Pro is on." : `Pro on · ${status?.exportsRemaining ?? 0} exports · ${status?.vocalTakesRemaining ?? 0} vocal takes`}
        </Text>
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(catalog.data?.plans ?? []).map((plan) => (
              <Pressable
                key={plan.id}
                onPress={() => setPlanId(plan.id)}
                style={[
                  styles.chip,
                  {
                    borderColor: planId === plan.id ? colors.primary : colors.border,
                    backgroundColor: planId === plan.id ? colors.primary : colors.background,
                  },
                ]}
              >
                <Text style={{ color: planId === plan.id ? "#fff" : colors.foreground, fontWeight: "700", fontSize: 12 }}>
                  {plan.label} · ${(plan.subtotalCents / 100).toFixed(2)}
                </Text>
              </Pressable>
            ))}
          </View>
          <BillingStatePicker value={stateCode} onChange={setStateCode} />
          <NoRefundPurchaseAck checked={accepted} onToggle={() => setAccepted((v) => !v)} />
          <PaymentChannelNotice compact />
          {quote.data?.purchaseSummary ? (
            <PurchaseSummaryCard summary={quote.data.purchaseSummary} />
          ) : null}
          <Pressable
            onPress={() => {
              if (!hasState || !stateCode) {
                setNote("Pick your billing state first.");
                return;
              }
              purchase.mutate({
                planId,
                stateCode,
                clientPlatform,
                acceptedNoRefund: true,
              });
            }}
            disabled={purchase.isPending || !accepted}
            style={[styles.buy, { backgroundColor: accepted ? colors.primary : colors.muted }]}
          >
            {purchase.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "800" }}>
                {isPlatformOwner ? "Turn on Pro (owner)" : "Pay and unlock Pro"}
              </Text>
            )}
          </Pressable>
        </>
      )}

      {hasPro ? (
        <>
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>Mixer</Text>
          {MUSIC_TRACKS.map((track) => (
            <View key={track} style={styles.mixRow}>
              <Text style={{ width: 44, color: colors.muted, fontSize: 11, fontWeight: "700" }}>{track}</Text>
              <Pressable onPress={() => bump(track, "volume", -5)} style={styles.nudge}>
                <Text style={{ color: colors.foreground }}>−vol</Text>
              </Pressable>
              <Text style={{ color: colors.foreground, fontSize: 11, width: 28 }}>{mixer[track].volume}</Text>
              <Pressable onPress={() => bump(track, "volume", 5)} style={styles.nudge}>
                <Text style={{ color: colors.foreground }}>+vol</Text>
              </Pressable>
              <Pressable onPress={() => bump(track, "pan", -10)} style={styles.nudge}>
                <Text style={{ color: colors.foreground }}>L</Text>
              </Pressable>
              <Text style={{ color: colors.foreground, fontSize: 11, width: 24 }}>{mixer[track].pan}</Text>
              <Pressable onPress={() => bump(track, "pan", 10)} style={styles.nudge}>
                <Text style={{ color: colors.foreground }}>R</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  onMixerChange({ ...mixer, [track]: { ...mixer[track], mute: !mixer[track].mute } })
                }
                style={styles.nudge}
              >
                <Text style={{ color: colors.foreground }}>{mixer[track].mute ? "unmute" : "mute"}</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  onMixerChange({ ...mixer, [track]: { ...mixer[track], solo: !mixer[track].solo } })
                }
                style={styles.nudge}
              >
                <Text style={{ color: colors.foreground }}>{mixer[track].solo ? "unsolo" : "solo"}</Text>
              </Pressable>
            </View>
          ))}

          <Text style={{ color: colors.foreground, fontWeight: "700" }}>
            FX · reverb {fx.reverb} · delay {fx.delay} · filter {fx.filter}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {(
              [
                ["reverb", -8],
                ["reverb", 8],
                ["delay", -8],
                ["delay", 8],
                ["filter", -10],
                ["filter", 10],
              ] as const
            ).map(([field, delta]) => (
              <Pressable
                key={`${field}-${delta}`}
                onPress={() => onFxChange({ ...fx, [field]: clampFx(fx[field] + delta) })}
                style={styles.nudge}
              >
                <Text style={{ color: colors.foreground, fontSize: 11 }}>
                  {field} {delta > 0 ? "+" : ""}
                  {delta}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Pressable
              onPress={() => {
                playMusicChord(keyName);
              }}
              style={[styles.chip, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>Play {keyName} chord</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                consumeExport.mutate(undefined, {
                  onSuccess: () => {
                    const ok = exportMusicStudioWav({ pattern, bpm, kit, mixer, title, steps: 32 });
                    setNote(ok ? "WAV downloaded." : "Export plays on the website / PWA.");
                    void utils.musicStudio.catalog.invalidate();
                  },
                  onError: (error) => setNote(error.message),
                });
              }}
              style={[styles.chip, { borderColor: colors.primary }]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>Export WAV</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                consumeVocal.mutate(undefined, {
                  onSuccess: () => {
                    setNote("Vocal take credited. Use your device mic on the website — 8 seconds, session only.");
                    void startVocalTake();
                    void utils.musicStudio.catalog.invalidate();
                  },
                  onError: (error) => setNote(error.message),
                });
              }}
              style={[styles.chip, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>Vocal take</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {note ? <Text style={{ color: colors.muted, fontSize: 12 }}>{note}</Text> : null}
    </View>
  );
}

async function startVocalTake(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  rec.start();
  setTimeout(() => {
    if (rec.state === "recording") rec.stop();
    stream.getTracks().forEach((track) => track.stop());
  }, 8000);
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  title: { fontSize: 16, fontWeight: "800" },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  buy: { borderRadius: 10, padding: 12, alignItems: "center" },
  mixRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4 },
  nudge: { borderWidth: 1, borderColor: "#3a3a3a", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
});
