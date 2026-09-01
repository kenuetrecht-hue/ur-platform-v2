import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Switch,
  StyleSheet,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { MuxVideoUploader } from "@/components/mux-video-uploader";
import {
  SESSION_CAPACITY_PRESETS,
  CREATOR_MIN_PRICE_CENTS_PER_MINUTE,
  ALLOWED_SESSION_DURATIONS,
  durationLabel,
  computeSessionTicketCents,
  type AllowedSessionDuration,
} from "@/lib/ai-session-constants";

export function AiSessionProgrammingPanel() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scheduleAiId, setScheduleAiId] = useState("");
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleStart, setScheduleStart] = useState("");

  const [videoAiId, setVideoAiId] = useState("");
  const [videoTopic, setVideoTopic] = useState("");

  const programs = trpc.aiLiveSessions.listPrograms.useQuery();
  const sessions = trpc.aiLiveSessions.listAllSessions.useQuery();
  const stats = trpc.aiLiveSessions.ownerStats.useQuery();
  const videoStatus = trpc.aiLiveSessions.videoGenStatus.useQuery();
  const creatorVideos = trpc.aiLiveSessions.listCreatorVideos.useQuery(undefined);

  const publishReplay = trpc.aiLiveSessions.publishReplay.useMutation({
    onSuccess: () => {
      void utils.aiLiveSessions.listAllSessions.invalidate();
      void utils.aiLiveSessions.listReplays.invalidate();
    },
  });
  const setProgram = trpc.aiLiveSessions.setProgram.useMutation({
    onSuccess: () => void utils.aiLiveSessions.listPrograms.invalidate(),
  });
  const schedule = trpc.aiLiveSessions.scheduleSession.useMutation({
    onSuccess: () => {
      setScheduleTitle("");
      setScheduleStart("");
      void utils.aiLiveSessions.listAllSessions.invalidate();
      void utils.aiLiveSessions.ownerStats.invalidate();
      void utils.aiLiveSessions.listUpcoming.invalidate();
    },
  });
  const cancel = trpc.aiLiveSessions.cancelSession.useMutation({
    onSuccess: () => {
      void utils.aiLiveSessions.listAllSessions.invalidate();
      void utils.aiLiveSessions.listUpcoming.invalidate();
    },
  });
  const extendOvertime = trpc.aiLiveSessions.extendOvertime.useMutation({
    onSuccess: () => void utils.aiLiveSessions.listAllSessions.invalidate(),
  });
  const requestVideo = trpc.aiLiveSessions.requestCreatorVideo.useMutation({
    onSuccess: () => {
      setVideoTopic("");
      void utils.aiLiveSessions.listCreatorVideos.invalidate();
    },
  });

  const enabledPrograms = programs.data?.filter((p) => p.enabled) ?? [];

  return (
    <View style={{ gap: 16, paddingBottom: 24 }}>
      <View style={[styles.banner, { backgroundColor: `${colors.primary}12`, borderColor: colors.primary }]}>
        <Text style={[styles.bannerTitle, { color: colors.foreground }]}>🎥 Program AI live sessions</Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
          Content creators set class length (15, 30, 45, or 60 min) and must stay live for the full
          committed time. <Text style={{ fontWeight: "700" }}>$0.20/min is the floor</Text> — you
          cannot go lower than twenty cents per minute. Set any higher rate your audience will pay
          (e.g. $5.00/min). Optional overtime after the commitment. Up to 10,000 seats per class.
        </Text>
        {stats.data ? (
          <Text style={{ color: colors.foreground, fontSize: 12, marginTop: 4 }}>
            {stats.data.upcoming} upcoming · {stats.data.totalAttendees} tickets sold · est. $
            {(stats.data.estimatedRevenueCents / 100).toFixed(2)} revenue
          </Text>
        ) : null}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Per-AI programming</Text>
      {programs.isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        programs.data?.map((program) => {
          const open = expandedId === program.creatorAiId;
          return (
            <ProgramEditor
              key={program.creatorAiId}
              program={program}
              open={open}
              onToggle={() => setExpandedId(open ? null : program.creatorAiId)}
              onSave={(patch) =>
                setProgram.mutate({ creatorAiId: program.creatorAiId, ...patch })
              }
              saving={setProgram.isPending}
              colors={colors}
            />
          );
        })
      )}

      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15, marginBottom: 8 }}>
          Schedule a live session
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 10 }}>
          Pick an enabled AI and start time (ISO format, e.g. 2026-08-10T18:00:00.000Z).
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 10 }}>
          {enabledPrograms.length === 0 ? (
            <Text style={{ color: colors.muted, fontSize: 13 }}>Enable at least one AI above first.</Text>
          ) : (
            enabledPrograms.map((p) => (
              <Pressable
                key={p.creatorAiId}
                onPress={() => setScheduleAiId(p.creatorAiId)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: scheduleAiId === p.creatorAiId ? colors.primary : colors.background,
                    borderColor: scheduleAiId === p.creatorAiId ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: scheduleAiId === p.creatorAiId ? "#fff" : colors.foreground,
                    fontWeight: "700",
                    fontSize: 12,
                  }}
                >
                  {p.creatorName}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
        <TextInput
          value={scheduleTitle}
          onChangeText={setScheduleTitle}
          placeholder="Optional custom title"
          placeholderTextColor={colors.muted}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 8, lineHeight: 16 }}>
          Start time must be at least 12 hours from now. Attendees can sign up until 1 hour before class.
        </Text>
        <TextInput
          value={scheduleStart}
          onChangeText={setScheduleStart}
          placeholder="Start time ISO (2026-08-10T18:00:00.000Z)"
          placeholderTextColor={colors.muted}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
        />
        <Pressable
          disabled={!scheduleAiId || !scheduleStart || schedule.isPending}
          onPress={() =>
            schedule.mutate({
              creatorAiId: scheduleAiId,
              startsAt: scheduleStart,
              title: scheduleTitle.trim() || undefined,
            })
          }
          style={[
            styles.primaryBtn,
            {
              backgroundColor: colors.primary,
              opacity: !scheduleAiId || !scheduleStart ? 0.5 : 1,
              marginTop: 10,
            },
          ]}
        >
          {schedule.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Schedule session</Text>
          )}
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Scheduled sessions</Text>
      {sessions.data?.length === 0 ? (
        <Text style={{ color: colors.muted, paddingHorizontal: 16 }}>No sessions yet.</Text>
      ) : (
        sessions.data?.map((s) => (
          <View
            key={s.id}
            style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, marginHorizontal: 16 }]}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>{s.title}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {s.creatorName} · {new Date(s.startsAt).toLocaleString()} · {s.durationMinutes} min ·
              ${(s.priceCentsPerMinute / 100).toFixed(2)}/min · ${(s.priceCents / 100).toFixed(2)} ticket
              · {s.attendeeCount.toLocaleString()}/{s.maxAttendees.toLocaleString()} sold · {s.status}
            </Text>
            {s.status === "scheduled" || s.status === "live" ? (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {s.status === "live" && s.allowOvertime ? (
                  <Pressable
                    onPress={() => extendOvertime.mutate({ sessionId: s.id, additionalMinutes: 15 })}
                    style={[styles.overtimeBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>+15 min overtime</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => cancel.mutate({ sessionId: s.id })}
                  style={styles.dangerBtn}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>Cancel</Text>
                </Pressable>
              </View>
            ) : null}
            {s.status === "ended" ? (
              <View style={{ marginTop: 8, gap: 8 }}>
                <MuxVideoUploader sessionId={s.id} />
                <Pressable
                  onPress={() =>
                    publishReplay.mutate({
                      sessionId: s.id,
                      priceCents: Math.max(99, Math.round(s.priceCents / 2)),
                    })
                  }
                  disabled={publishReplay.isPending}
                  style={[styles.overtimeBtn, { backgroundColor: "#059669" }]}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                    Publish pay-per-view replay
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))
      )}

      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, marginHorizontal: 16 }]}>
        <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15 }}>🎬 AI follower videos</Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 }}>
          {videoStatus.data?.message ??
            "Once the platform earns enough revenue, each AI can auto-generate short promo videos to attract followers."}
        </Text>
        {videoStatus.data?.unlocked ? (
          <View style={{ gap: 8, marginTop: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {enabledPrograms.map((p) => (
                <Pressable
                  key={p.creatorAiId}
                  onPress={() => setVideoAiId(p.creatorAiId)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: videoAiId === p.creatorAiId ? colors.primary : colors.background,
                      borderColor: videoAiId === p.creatorAiId ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: videoAiId === p.creatorAiId ? "#fff" : colors.foreground,
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    {p.creatorName}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <TextInput
              value={videoTopic}
              onChangeText={setVideoTopic}
              placeholder="Video topic / hook to attract followers"
              placeholderTextColor={colors.muted}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            />
            <Pressable
              disabled={!videoAiId || videoTopic.trim().length < 4 || requestVideo.isPending}
              onPress={() =>
                requestVideo.mutate({
                  creatorAiId: videoAiId,
                  topic: videoTopic.trim(),
                  style: "follow_cta",
                })
              }
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: !videoAiId || videoTopic.trim().length < 4 ? 0.5 : 1,
                },
              ]}
            >
              <Text style={styles.primaryBtnText}>Generate promo video</Text>
            </Pressable>
            {creatorVideos.data?.slice(0, 3).map((v) => (
              <Text key={v.id} style={{ color: colors.muted, fontSize: 11 }}>
                ✓ {v.creatorName}: {v.topic} — {v.shareCaption}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ProgramEditor({
  program,
  open,
  onToggle,
  onSave,
  saving,
  colors,
}: {
  program: {
    creatorAiId: string;
    creatorName: string;
    enabled: boolean;
    durationMinutes: AllowedSessionDuration;
    priceCentsPerMinute: number;
    maxAttendees: number;
    allowOvertime?: boolean;
    ticketUsd?: string;
    pricePerMinuteUsd?: string;
    defaultTitle: string;
    hostScript: string;
    sessionDescription: string;
  };
  open: boolean;
  onToggle: () => void;
  onSave: (patch: Record<string, unknown>) => void;
  saving: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const [enabled, setEnabled] = useState(program.enabled);
  const [duration, setDuration] = useState<AllowedSessionDuration>(
    ALLOWED_SESSION_DURATIONS.includes(program.durationMinutes as AllowedSessionDuration)
      ? (program.durationMinutes as AllowedSessionDuration)
      : 60,
  );
  const [allowOvertime, setAllowOvertime] = useState(program.allowOvertime ?? true);
  const [pricePerMin, setPricePerMin] = useState(
    String((program.priceCentsPerMinute / 100).toFixed(2)),
  );
  const [maxAttendees, setMaxAttendees] = useState(String(program.maxAttendees));
  const [title, setTitle] = useState(program.defaultTitle);
  const [description, setDescription] = useState(program.sessionDescription);
  const [hostScript, setHostScript] = useState(program.hostScript);

  const rateCents = Math.max(
    CREATOR_MIN_PRICE_CENTS_PER_MINUTE,
    Math.round(parseFloat(pricePerMin) * 100) || CREATOR_MIN_PRICE_CENTS_PER_MINUTE,
  );
  const previewTicket = computeSessionTicketCents(duration, rateCents);

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, marginHorizontal: 16 }]}>
      <Pressable onPress={onToggle} style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.foreground, fontWeight: "800" }}>{program.creatorName}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {program.enabled ? "Live sessions on" : "Off"} · {program.durationMinutes} min · $
            {(program.priceCentsPerMinute / 100).toFixed(2)}/min · up to{" "}
            {program.maxAttendees.toLocaleString()} seats
          </Text>
        </View>
        <Text style={{ color: colors.primary, fontWeight: "700" }}>{open ? "▲" : "▼"}</Text>
      </Pressable>
      {open ? (
        <View style={{ gap: 8, marginTop: 10 }}>
          <View style={styles.row}>
            <Text style={{ color: colors.foreground, flex: 1 }}>Enable live sessions</Text>
            <Switch value={enabled} onValueChange={setEnabled} />
          </View>
          <Text style={{ color: colors.muted, fontSize: 11 }}>
            Class length — host must stay for the full committed time:
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ALLOWED_SESSION_DURATIONS.map((d) => (
              <Pressable
                key={d}
                onPress={() => setDuration(d)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: duration === d ? colors.primary : colors.background,
                    borderColor: duration === d ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: duration === d ? "#fff" : colors.foreground,
                    fontWeight: "700",
                    fontSize: 11,
                  }}
                >
                  {durationLabel(d)}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.row}>
            <Text style={{ color: colors.foreground, flex: 1 }}>Allow overtime after commitment</Text>
            <Switch value={allowOvertime} onValueChange={setAllowOvertime} />
          </View>
          <Text style={{ color: colors.muted, fontSize: 11 }}>
            Rate per minute — floor $0.20, no ceiling (e.g. $5.00/min if people will pay it):
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[0.2, 1, 2, 5, 10].map((rate) => (
              <Pressable
                key={rate}
                onPress={() => setPricePerMin(rate.toFixed(2))}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      parseFloat(pricePerMin) === rate ? colors.primary : colors.background,
                    borderColor:
                      parseFloat(pricePerMin) === rate ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: parseFloat(pricePerMin) === rate ? "#fff" : colors.foreground,
                    fontWeight: "700",
                    fontSize: 11,
                  }}
                >
                  ${rate.toFixed(2)}/min
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={pricePerMin}
            onChangeText={setPricePerMin}
            keyboardType="decimal-pad"
            placeholder="Custom rate per minute (e.g. 5.00)"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Ticket preview: ${(previewTicket / 100).toFixed(2)} for {duration} min committed @ $
            {(rateCents / 100).toFixed(2)}/min
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>
            Room capacity — Zoom-scale (up to 10,000):
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {SESSION_CAPACITY_PRESETS.map((cap) => (
              <Pressable
                key={cap}
                onPress={() => setMaxAttendees(String(cap))}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      parseInt(maxAttendees, 10) === cap ? colors.primary : colors.background,
                    borderColor:
                      parseInt(maxAttendees, 10) === cap ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: parseInt(maxAttendees, 10) === cap ? "#fff" : colors.foreground,
                    fontWeight: "700",
                    fontSize: 11,
                  }}
                >
                  {cap.toLocaleString()}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={maxAttendees}
            onChangeText={setMaxAttendees}
            keyboardType="number-pad"
            placeholder="Max attendees (up to 10,000)"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Default session title"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Public description"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.multiline, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Text style={{ color: colors.muted, fontSize: 11 }}>Host script — AI must honor full committed duration:</Text>
          <TextInput
            value={hostScript}
            onChangeText={setHostScript}
            multiline
            placeholder="Host script"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.multilineTall, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Pressable
            disabled={saving}
            onPress={() =>
              onSave({
                enabled,
                durationMinutes: duration,
                priceCentsPerMinute: rateCents,
                maxAttendees: Math.min(10_000, parseInt(maxAttendees, 10) || 5_000),
                allowOvertime,
                defaultTitle: title,
                sessionDescription: description,
                hostScript,
              })
            }
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Save programming</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  bannerTitle: { fontSize: 17, fontWeight: "800" },
  sectionTitle: { fontSize: 16, fontWeight: "700", paddingHorizontal: 16 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  multiline: { minHeight: 72, textAlignVertical: "top" },
  multilineTall: { minHeight: 140, textAlignVertical: "top" },
  primaryBtn: { borderRadius: 10, padding: 12, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  dangerBtn: { backgroundColor: "#c0392b", borderRadius: 8, padding: 8, alignSelf: "flex-start" },
  overtimeBtn: { borderRadius: 8, padding: 8 },
  chip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
});
