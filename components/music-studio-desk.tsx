import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import {
  MUSIC_KITS,
  MUSIC_KEYS,
  MUSIC_LYRICS_MAX,
  MUSIC_NOTES_MAX,
  MUSIC_TITLE_MAX,
  clampCrossfade,
  clampCueStep,
  clampMusicBpm,
  emptyDeckBPattern,
  emptyMusicFx,
  emptyMusicMixer,
  emptyMusicPattern,
  suggestChordProgressions,
  toggleMusicStep,
  visibleMusicSteps,
  visibleMusicTracks,
  type MusicDeckId,
  type MusicFx,
  type MusicKeyId,
  type MusicKitId,
  type MusicMixer,
  type MusicPattern,
  type PublicMusicProject,
} from "@/lib/music-studio";
import {
  canPlayMusicStudio,
  cueMusicStudio,
  playMusicStudioPattern,
  stopMusicStudioPlayback,
  updateMusicStudioLive,
} from "@/lib/music-studio-playback";
import { MusicStudioProPanel } from "@/components/music-studio-pro-panel";
import { MusicStudioBooth } from "@/components/music-studio-booth";
import { MusicStudioHookups } from "@/components/music-studio-hookups";
import { usePlatformOwner } from "@/lib/use-platform-owner";

type Props = {
  onProjectChange?: (project: PublicMusicProject | null) => void;
};

export function MusicStudioDesk({ onProjectChange }: Props) {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const { isPlatformOwner } = usePlatformOwner();
  const utils = trpc.useUtils();
  const proStatus = trpc.musicStudio.status.useQuery(undefined, { enabled: isAuthenticated });
  const hasPro = Boolean(proStatus.data?.hasPro || isPlatformOwner);
  const tracks = visibleMusicTracks(hasPro);
  const steps = visibleMusicSteps(hasPro);
  const list = trpc.musicStudio.list.useQuery(undefined, { enabled: isAuthenticated });
  const create = trpc.musicStudio.create.useMutation({
    onSuccess: (project) => {
      applyProject(project);
      void utils.musicStudio.list.invalidate();
    },
  });
  const save = trpc.musicStudio.save.useMutation({
    onSuccess: (project) => {
      applyProject(project);
      void utils.musicStudio.list.invalidate();
    },
  });
  const join = trpc.musicStudio.join.useMutation({
    onSuccess: (project) => {
      applyProject(project);
      void utils.musicStudio.list.invalidate();
    },
  });

  const [projectId, setProjectId] = useState<string | null>(null);
  const [title, setTitle] = useState("Untitled beat");
  const [bpm, setBpm] = useState(90);
  const [kit, setKit] = useState<MusicKitId>("hiphop");
  const [key, setKey] = useState<MusicKeyId>("C");
  const [pattern, setPattern] = useState<MusicPattern>(emptyMusicPattern);
  const [patternB, setPatternB] = useState<MusicPattern>(emptyDeckBPattern);
  const [crossfade, setCrossfade] = useState(50);
  const [cueStepA, setCueStepA] = useState(0);
  const [cueStepB, setCueStepB] = useState(0);
  const [editDeck, setEditDeck] = useState<MusicDeckId>("a");
  const [metronome, setMetronome] = useState(false);
  const [mixer, setMixer] = useState<MusicMixer>(emptyMusicMixer);
  const [fx, setFx] = useState<MusicFx>(emptyMusicFx);
  const [lyrics, setLyrics] = useState("");
  const [notes, setNotes] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [playing, setPlaying] = useState(false);
  const [playStep, setPlayStep] = useState(-1);
  const [status, setStatus] = useState<string | null>(null);

  const chords = useMemo(() => suggestChordProgressions(key), [key]);

  const applyProject = useCallback(
    (project: PublicMusicProject) => {
      setProjectId(project.id);
      setTitle(project.title);
      setBpm(project.bpm);
      setKit(project.kit);
      setKey(project.key);
      setPattern(project.pattern);
      setPatternB(project.patternB ?? emptyDeckBPattern());
      setCrossfade(project.crossfade ?? 50);
      setCueStepA(project.cueStepA ?? 0);
      setCueStepB(project.cueStepB ?? 0);
      setMixer(project.mixer ?? emptyMusicMixer());
      setFx(project.fx ?? emptyMusicFx());
      setLyrics(project.lyrics);
      setNotes(project.notes);
      setJoinCode(project.joinCode);
      onProjectChange?.(project);
    },
    [onProjectChange],
  );

  useEffect(() => {
    const first = list.data?.projects[0];
    if (!projectId && first) applyProject(first);
  }, [applyProject, list.data?.projects, projectId]);

  useEffect(() => () => stopMusicStudioPlayback(), []);

  useEffect(() => {
    updateMusicStudioLive({
      pattern,
      patternB,
      mixer,
      fx,
      bpm,
      kit,
      crossfade,
      metronome,
    });
  }, [bpm, crossfade, fx, kit, metronome, mixer, pattern, patternB]);

  const persist = useCallback(() => {
    if (!isAuthenticated) {
      setStatus("Sign in to save or share a beat.");
      return;
    }
    if (!projectId) {
      create.mutate({ title });
      return;
    }
    save.mutate({
      projectId,
      title,
      bpm,
      kit,
      key,
      pattern,
      patternB,
      crossfade,
      cueStepA,
      cueStepB,
      mixer,
      fx,
      lyrics,
      notes,
    });
  }, [
    bpm,
    create,
    crossfade,
    cueStepA,
    cueStepB,
    fx,
    isAuthenticated,
    kit,
    key,
    lyrics,
    mixer,
    notes,
    pattern,
    patternB,
    projectId,
    save,
    title,
  ]);

  const togglePlay = useCallback(() => {
    if (playing) {
      stopMusicStudioPlayback();
      setPlaying(false);
      setPlayStep(-1);
      return;
    }
    const started = playMusicStudioPattern({
      pattern,
      patternB,
      bpm,
      kit,
      mixer,
      fx,
      steps,
      crossfade,
      metronome,
      onStep: setPlayStep,
    });
    if (!started) {
      setStatus("Playback is on the website / PWA. Pads still edit on this device.");
      return;
    }
    setPlaying(true);
    setStatus(null);
  }, [bpm, crossfade, fx, kit, metronome, mixer, pattern, patternB, playing, steps]);

  const fireCue = useCallback(
    (deck: MusicDeckId) => {
      const started = cueMusicStudio({
        pattern,
        patternB,
        bpm,
        kit,
        mixer,
        fx,
        steps,
        cueStep: deck === "b" ? cueStepB : cueStepA,
        deck,
        onStep: setPlayStep,
      });
      if (!started) {
        setStatus("Cue is on the website / PWA.");
      }
    },
    [bpm, cueStepA, cueStepB, fx, kit, mixer, pattern, patternB, steps],
  );

  const changeCrossfade = useCallback((value: number) => {
    const next = clampCrossfade(value);
    setCrossfade(next);
    updateMusicStudioLive({ crossfade: next });
  }, []);

  const toggleMetronome = useCallback(() => {
    setMetronome((on) => {
      updateMusicStudioLive({ metronome: !on });
      return !on;
    });
  }, []);

  if (!isAuthenticated) {
    return (
      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={{ color: colors.foreground, fontWeight: "700" }}>Sign in to use Music Studio</Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
          Save beats, share a join code, and keep lyrics with Musician and Songwriter.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Pressable
          onPress={() => create.mutate({ title: "New beat" })}
          style={[styles.chip, { borderColor: colors.primary, backgroundColor: colors.primary }]}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>New beat</Text>
        </Pressable>
        <Pressable
          onPress={persist}
          style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          {create.isPending || save.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>Save</Text>
          )}
        </Pressable>
        <Pressable
          onPress={togglePlay}
          style={[
            styles.chip,
            {
              borderColor: colors.primary,
              backgroundColor: playing ? colors.surface : colors.primary,
            },
          ]}
        >
          <Text style={{ color: playing ? colors.foreground : "#fff", fontWeight: "700" }}>
            {playing ? "Stop" : canPlayMusicStudio() ? "Play mix" : "Play (web)"}
          </Text>
        </Pressable>
      </View>

      <MusicStudioBooth
        title={title}
        bpm={bpm}
        playing={playing}
        metronome={metronome}
        crossfade={crossfade}
        editDeck={editDeck}
        onToggleMetronome={toggleMetronome}
        onCrossfade={changeCrossfade}
        onEditDeck={setEditDeck}
        onCue={fireCue}
        onCopyAToB={() => {
          setPatternB(pattern);
          updateMusicStudioLive({ patternB: pattern });
        }}
        onSetCueHere={(deck) => {
          const here = clampCueStep(playStep >= 0 ? playStep : 0);
          if (deck === "b") setCueStepB(here);
          else setCueStepA(here);
        }}
      />

      <TextInput
        value={title}
        onChangeText={setTitle}
        maxLength={MUSIC_TITLE_MAX}
        placeholder="Beat title"
        placeholderTextColor={colors.muted}
        style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
      />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Text style={{ color: colors.muted, fontWeight: "700" }}>BPM {bpm}</Text>
        {[70, 90, 110, 128, 140].map((value) => (
          <Pressable
            key={value}
            onPress={() => setBpm(clampMusicBpm(value))}
            style={[
              styles.mini,
              {
                borderColor: bpm === value ? colors.primary : colors.border,
                backgroundColor: bpm === value ? colors.primary : colors.surface,
              },
            ]}
          >
            <Text style={{ color: bpm === value ? "#fff" : colors.foreground, fontSize: 12 }}>{value}</Text>
          </Pressable>
        ))}
      </View>

      <RowLabel label="Kit" colors={colors}>
        {MUSIC_KITS.map((id) => (
          <Pressable
            key={id}
            onPress={() => setKit(id)}
            style={[
              styles.mini,
              {
                borderColor: kit === id ? colors.primary : colors.border,
                backgroundColor: kit === id ? colors.primary : colors.surface,
              },
            ]}
          >
            <Text style={{ color: kit === id ? "#fff" : colors.foreground, fontSize: 12 }}>{id}</Text>
          </Pressable>
        ))}
      </RowLabel>

      <RowLabel label="Key" colors={colors}>
        {MUSIC_KEYS.map((id) => (
          <Pressable
            key={id}
            onPress={() => setKey(id)}
            style={[
              styles.mini,
              {
                borderColor: key === id ? colors.primary : colors.border,
                backgroundColor: key === id ? colors.primary : colors.surface,
              },
            ]}
          >
            <Text style={{ color: key === id ? "#fff" : colors.foreground, fontSize: 12 }}>{id}</Text>
          </Pressable>
        ))}
      </RowLabel>

      <Text style={{ color: colors.muted, fontSize: 12 }}>
        Chords in {key}: {chords.join("  ·  ")}
      </Text>

      <View
        style={{
          gap: 6,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 10,
        }}
      >
        {tracks.map((track) => (
          <View key={track} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ width: 52, color: colors.muted, fontSize: 11, fontWeight: "700" }}>
              {track}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, flex: 1 }}>
              {Array.from({ length: steps }, (_, step) => {
                const activePattern = editDeck === "b" ? patternB : pattern;
                const on = activePattern[track][step];
                const current = playStep === step;
                const cueHere = (editDeck === "b" ? cueStepB : cueStepA) === step;
                return (
                  <Pressable
                    key={`${track}-${step}`}
                    onPress={() => {
                      if (editDeck === "b") {
                        setPatternB((prev) => toggleMusicStep(prev, track, step));
                        updateMusicStudioLive({
                          patternB: toggleMusicStep(patternB, track, step),
                        });
                      } else {
                        setPattern((prev) => toggleMusicStep(prev, track, step));
                        updateMusicStudioLive({
                          pattern: toggleMusicStep(pattern, track, step),
                        });
                      }
                    }}
                    style={{
                      width: 18,
                      height: 22,
                      borderRadius: 4,
                      borderWidth: 1,
                      borderColor: current ? colors.primary : cueHere ? "#c9a227" : colors.border,
                      backgroundColor: on ? colors.primary : colors.surface,
                    }}
                  />
                );
              })}
            </View>
          </View>
        ))}
      </View>

      <TextInput
        value={lyrics}
        onChangeText={setLyrics}
        maxLength={MUSIC_LYRICS_MAX}
        placeholder="Lyrics pad — Songwriter can tighten this"
        placeholderTextColor={colors.muted}
        multiline
        style={[styles.input, styles.lyrics, { borderColor: colors.border, color: colors.foreground }]}
      />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        maxLength={MUSIC_NOTES_MAX}
        placeholder="Session notes for collaborators"
        placeholderTextColor={colors.muted}
        style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
      />

      {joinCode ? (
        <Text style={{ color: colors.foreground, fontSize: 13 }}>
          Collab code: <Text style={{ fontWeight: "800" }}>{joinCode}</Text> — share so someone can join this beat.
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={joinInput}
          onChangeText={setJoinInput}
          maxLength={8}
          autoCapitalize="characters"
          placeholder="Join a friend's code"
          placeholderTextColor={colors.muted}
          style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.foreground }]}
        />
        <Pressable
          onPress={() => join.mutate({ joinCode: joinInput })}
          style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>Join</Text>
        </Pressable>
      </View>

      {list.data?.projects.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {list.data.projects.slice(0, 8).map((project) => (
            <Pressable
              key={project.id}
              onPress={() => applyProject(project)}
              style={[
                styles.mini,
                {
                  borderColor: project.id === projectId ? colors.primary : colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Text style={{ color: colors.foreground, fontSize: 11 }} numberOfLines={1}>
                {project.title}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <MusicStudioHookups
        title={title}
        bpm={bpm}
        keyName={key}
        kit={kit}
        lyrics={lyrics}
        pattern={pattern}
      />

      <MusicStudioProPanel
        title={title}
        bpm={bpm}
        kit={kit}
        keyName={key}
        pattern={pattern}
        mixer={mixer}
        fx={fx}
        onMixerChange={setMixer}
        onFxChange={setFx}
      />

      {status || join.error || save.error || create.error ? (
        <Text style={{ color: colors.error, fontSize: 12 }}>
          {status ??
            join.error?.message ??
            save.error?.message ??
            create.error?.message}
        </Text>
      ) : null}
    </View>
  );
}

function RowLabel({
  label,
  colors,
  children,
}: {
  label: string;
  colors: { muted: string };
  children: ReactNode;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <Text style={{ color: colors.muted, fontWeight: "700", width: 36 }}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  mini: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  lyrics: { minHeight: 96, textAlignVertical: "top" },
});
