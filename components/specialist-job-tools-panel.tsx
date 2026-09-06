import { useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { printHtmlDocument } from "@/lib/ai-device-bridge";
import {
  US_STATES,
  specialistToolKinds,
  type SpecialistToolKind,
} from "@/lib/specialist-job-tools";

function textToBase64(text: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(text, "utf8").toString("base64");
  }
  return btoa(unescape(encodeURIComponent(text)));
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>{hint}</Text>
      {children}
    </View>
  );
}

function PrimaryButton({
  label,
  pending,
  onPress,
  disabled,
}: {
  label: string;
  pending?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={pending || disabled}
      style={[styles.btn, { backgroundColor: pending || disabled ? colors.muted : colors.primary }]}
    >
      {pending ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{label}</Text>}
    </Pressable>
  );
}

export function SpecialistJobToolsPanel({
  creatorId,
  creatorName,
}: {
  creatorId: string;
  creatorName: string;
}) {
  const colors = useColors();
  const kinds = useMemo(() => specialistToolKinds(creatorId), [creatorId]);
  const catalog = trpc.specialistTools.catalog.useQuery({ creatorId });
  const states = catalog.data?.states ?? US_STATES;

  if (kinds.length === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={{ color: colors.muted }}>This specialist does not have extra job tools.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>Job tools</Text>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
        Signed-in tools for {creatorName}. Educational only. Legal tools are not your lawyer. Shop send never
        presses Start.
      </Text>
      {kinds.includes("legalResearch") ? <LegalResearchCard creatorId={creatorId} states={states} /> : null}
      {kinds.includes("contract") ? <ContractCard creatorId={creatorId} /> : null}
      {kinds.includes("storyBible") ? <StoryBibleCard creatorId={creatorId} /> : null}
      {kinds.includes("fountain") ? <FountainCard creatorId={creatorId} /> : null}
      {kinds.includes("rhyme") ? <RhymeCard creatorId={creatorId} /> : null}
      {kinds.includes("print") ? <PrintCard creatorId={creatorId} creatorName={creatorName} /> : null}
      {kinds.includes("exportCheck") ? <ExportCard creatorId={creatorId} /> : null}
      {kinds.includes("cncSend") ? <CncSendCard creatorId={creatorId} /> : null}
      {kinds.includes("sandbox") || kinds.includes("github") ? (
        <Section
          title="Sandbox + GitHub"
          hint="Open the Build tab to preview diffs, run the test loop, and import a public GitHub repo (read-only, no push)."
        >
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            TechBuilder, GameForge, and ChainSmith use the existing sandbox. Private repos and tokens stay off
            the public-import path.
          </Text>
        </Section>
      ) : null}
    </ScrollView>
  );
}

function LegalResearchCard({
  creatorId,
  states,
}: {
  creatorId: string;
  states: readonly { code: string; name: string }[];
}) {
  const colors = useColors();
  const [stateCode, setStateCode] = useState("IN");
  const [query, setQuery] = useState("");
  const search = trpc.specialistTools.searchPublicLaw.useMutation();

  return (
    <Section
      title="State picker + public citations"
      hint="CourtListener opinions and a govinfo.gov search link. Not Westlaw. Not e-filing. Not legal advice."
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {states.map((s) => (
            <Pressable
              key={s.code}
              onPress={() => setStateCode(s.code)}
              style={[
                styles.chip,
                {
                  backgroundColor: stateCode === s.code ? colors.primary : "transparent",
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={{ color: stateCode === s.code ? "#fff" : colors.foreground, fontSize: 11, fontWeight: "700" }}>
                {s.code}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search a public legal question"
        placeholderTextColor={colors.muted}
        maxLength={180}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      />
      <PrimaryButton
        label="Search public sources"
        pending={search.isPending}
        disabled={!query.trim()}
        onPress={() => search.mutate({ creatorId, query: query.trim(), stateCode })}
      />
      {search.data ? (
        <View style={{ gap: 6 }}>
          <Text style={{ color: colors.muted, fontSize: 11 }}>{search.data.stamp}</Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>{search.data.note}</Text>
          {(search.data.results ?? []).map((row, i) => (
            <Text key={`${row.title}-${i}`} style={{ color: colors.foreground, fontSize: 12 }}>
              {row.title}
              {row.court ? ` · ${row.court}` : ""}
            </Text>
          ))}
          <Text style={{ color: colors.muted, fontSize: 11 }}>govinfo: {search.data.sources.govinfo}</Text>
        </View>
      ) : null}
    </Section>
  );
}

function ContractCard({ creatorId }: { creatorId: string }) {
  const colors = useColors();
  const [text, setText] = useState("");
  const [right, setRight] = useState("");
  const markup = trpc.specialistTools.markupContract.useMutation();
  const compare = trpc.specialistTools.compareDocuments.useMutation();

  return (
    <Section
      title="Contract markup + two-doc compare"
      hint="Flags common risk phrases and line differences. Not a substitute for a licensed attorney."
    >
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Paste contract or draft A"
        placeholderTextColor={colors.muted}
        multiline
        maxLength={20000}
        style={[styles.input, styles.tall, { color: colors.foreground, borderColor: colors.border }]}
      />
      <PrimaryButton
        label="Mark up draft A"
        pending={markup.isPending}
        disabled={text.trim().length < 8}
        onPress={() => markup.mutate({ creatorId, text })}
      />
      {markup.data
        ? markup.data.flags.map((f) => (
            <Text key={`${f.phrase}-${f.index}`} style={{ color: colors.foreground, fontSize: 12 }}>
              “{f.phrase}” — {f.note}
            </Text>
          ))
        : null}
      <TextInput
        value={right}
        onChangeText={setRight}
        placeholder="Paste draft B to compare"
        placeholderTextColor={colors.muted}
        multiline
        maxLength={20000}
        style={[styles.input, styles.tall, { color: colors.foreground, borderColor: colors.border }]}
      />
      <PrimaryButton
        label="Compare A and B"
        pending={compare.isPending}
        disabled={!text.trim() || !right.trim()}
        onPress={() => compare.mutate({ creatorId, left: text, right })}
      />
      {compare.data ? (
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          +{compare.data.added} / −{compare.data.removed} / ~{compare.data.changed} · {compare.data.stamp}
        </Text>
      ) : null}
    </Section>
  );
}

function StoryBibleCard({ creatorId }: { creatorId: string }) {
  const colors = useColors();
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("Untitled story");
  const [logline, setLogline] = useState("");
  const [chapterTitle, setChapterTitle] = useState("Chapter 1");
  const [chapterSummary, setChapterSummary] = useState("");
  const [expandNote, setExpandNote] = useState<string | null>(null);
  const list = trpc.specialistTools.listStoryBibles.useQuery({ creatorId });
  const save = trpc.specialistTools.saveStoryBible.useMutation({
    onSuccess: () => void utils.specialistTools.listStoryBibles.invalidate({ creatorId }),
  });
  const expand = trpc.specialistTools.expandChapter.useMutation({
    onSuccess: (r) => setExpandNote([r.title, ...r.beats].join("\n")),
  });

  const latest = list.data?.[0];

  return (
    <Section title="Story bible + chapter expand" hint="Characters, places, and a beat sheet — not finished prose.">
      <TextInput
        value={title}
        onChangeText={setTitle}
        maxLength={120}
        placeholder="Story title"
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      />
      <TextInput
        value={logline}
        onChangeText={setLogline}
        maxLength={400}
        placeholder="Logline"
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      />
      <TextInput
        value={chapterTitle}
        onChangeText={setChapterTitle}
        maxLength={120}
        placeholder="Chapter title"
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      />
      <TextInput
        value={chapterSummary}
        onChangeText={setChapterSummary}
        maxLength={800}
        multiline
        placeholder="What happens in this chapter"
        placeholderTextColor={colors.muted}
        style={[styles.input, styles.tall, { color: colors.foreground, borderColor: colors.border }]}
      />
      <PrimaryButton
        label="Save bible"
        pending={save.isPending}
        onPress={() =>
          save.mutate({
            creatorId,
            bibleId: latest?.id,
            title,
            logline,
            characters: [],
            locations: [],
            chapters: [{ id: latest?.chapters[0]?.id ?? "ch-1", title: chapterTitle, summary: chapterSummary }],
          })
        }
      />
      <PrimaryButton
        label="Expand chapter beats"
        pending={expand.isPending}
        disabled={!latest}
        onPress={() =>
          expand.mutate({
            creatorId,
            bibleId: latest!.id,
            chapterId: latest!.chapters[0]?.id ?? "ch-1",
          })
        }
      />
      {expandNote ? <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}>{expandNote}</Text> : null}
    </Section>
  );
}

function FountainCard({ creatorId }: { creatorId: string }) {
  const colors = useColors();
  const [source, setSource] = useState("INT. KITCHEN — NIGHT\nMARA\nWe keep the lights off.\nCUT TO:");
  const format = trpc.specialistTools.formatFountain.useMutation();

  return (
    <Section title="Fountain screenplay layout" hint="Scene headings, character cues, and dialogue spacing.">
      <TextInput
        value={source}
        onChangeText={setSource}
        multiline
        maxLength={20000}
        style={[styles.input, styles.tall, { color: colors.foreground, borderColor: colors.border }]}
      />
      <PrimaryButton
        label="Format screenplay"
        pending={format.isPending}
        onPress={() => format.mutate({ creatorId, source })}
      />
      {format.data ? (
        <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}>{format.data.plain}</Text>
      ) : null}
    </Section>
  );
}

function RhymeCard({ creatorId }: { creatorId: string }) {
  const colors = useColors();
  const [word, setWord] = useState("night");
  const rhyme = trpc.specialistTools.rhymeHelper.useMutation();

  return (
    <Section title="Rhyme / syllable helper" hint="A starting bank of English rhymes — not a publisher.">
      <TextInput
        value={word}
        onChangeText={setWord}
        maxLength={40}
        placeholder="Word"
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      />
      <PrimaryButton
        label="Suggest rhymes"
        pending={rhyme.isPending}
        disabled={!word.trim()}
        onPress={() => rhyme.mutate({ creatorId, word: word.trim() })}
      />
      {rhyme.data ? (
        <Text style={{ color: colors.foreground, fontSize: 13 }}>
          {rhyme.data.syllables} syllables · {rhyme.data.rhymes.join(", ") || "No bank match — try a shorter ending."}
        </Text>
      ) : null}
    </Section>
  );
}

function PrintCard({ creatorId, creatorName }: { creatorId: string; creatorName: string }) {
  const colors = useColors();
  const [title, setTitle] = useState("Draft");
  const [body, setBody] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const print = trpc.specialistTools.printableDraft.useMutation({
    onSuccess: (r) => {
      const result = printHtmlDocument(r.html);
      setNote(`${r.stamp} ${result.detail}`);
    },
    onError: (e) => setNote(e.message),
  });

  return (
    <Section
      title="One-tap print / PDF"
      hint="Opens your device print dialog. Legal drafts carry a not-your-lawyer stamp."
    >
      <TextInput
        value={title}
        onChangeText={setTitle}
        maxLength={120}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      />
      <TextInput
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={40000}
        placeholder="Draft to print"
        placeholderTextColor={colors.muted}
        style={[styles.input, styles.tall, { color: colors.foreground, borderColor: colors.border }]}
      />
      <PrimaryButton
        label="Print or save PDF"
        pending={print.isPending}
        disabled={!body.trim()}
        onPress={() => print.mutate({ creatorId, title, body, creatorName })}
      />
      {note ? <Text style={{ color: colors.muted, fontSize: 11 }}>{note}</Text> : null}
    </Section>
  );
}

function ExportCard({ creatorId }: { creatorId: string }) {
  const colors = useColors();
  const [fileName, setFileName] = useState("part.gcode");
  const [content, setContent] = useState("G21\nG90\nG0 X0 Y0\nM30");
  const check = trpc.specialistTools.checkShopExport.useMutation();

  return (
    <Section title="Export check (STL / 3MF / G-code)" hint="Structure check only — not a guarantee the machine will cut clean.">
      <TextInput
        value={fileName}
        onChangeText={setFileName}
        maxLength={255}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      />
      <TextInput
        value={content}
        onChangeText={setContent}
        multiline
        maxLength={20000}
        placeholder="Paste ASCII STL, or G-code text"
        placeholderTextColor={colors.muted}
        style={[styles.input, styles.tall, { color: colors.foreground, borderColor: colors.border }]}
      />
      <PrimaryButton
        label="Check export"
        pending={check.isPending}
        onPress={() =>
          check.mutate({
            creatorId,
            fileName,
            fileContentBase64: textToBase64(content),
          })
        }
      />
      {check.data ? (
        <Text style={{ color: colors.foreground, fontSize: 12 }}>
          {check.data.kind} · {check.data.ok ? "Looks usable" : check.data.issues.join(" · ")}
        </Text>
      ) : null}
    </Section>
  );
}

function CncSendCard({ creatorId }: { creatorId: string }) {
  const colors = useColors();
  const connections = trpc.equipment.listConnections.useQuery();
  const [connectionId, setConnectionId] = useState<string>("");
  const [fileName, setFileName] = useState("job.gcode");
  const [content, setContent] = useState("G21\nG90\nM30");
  const [note, setNote] = useState<string | null>(null);
  const send = trpc.specialistTools.sendShopFile.useMutation({
    onSuccess: (r) => setNote(r.reminder),
    onError: (e) => setNote(e.message),
  });

  return (
    <Section
      title="Send file — you start"
      hint="Uploads to a machine you already connected. This AI will not press Start."
    >
      {(connections.data ?? []).map((c) => (
        <Pressable
          key={c.id}
          onPress={() => setConnectionId(c.id)}
          style={[
            styles.chip,
            {
              borderColor: colors.border,
              backgroundColor: connectionId === c.id ? colors.primary : "transparent",
            },
          ]}
        >
          <Text style={{ color: connectionId === c.id ? "#fff" : colors.foreground, fontSize: 12 }}>
            {c.equipmentName ?? c.id}
          </Text>
        </Pressable>
      ))}
      <TextInput
        value={fileName}
        onChangeText={setFileName}
        maxLength={255}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      />
      <TextInput
        value={content}
        onChangeText={setContent}
        multiline
        maxLength={20000}
        style={[styles.input, styles.tall, { color: colors.foreground, borderColor: colors.border }]}
      />
      <PrimaryButton
        label="Send file only"
        pending={send.isPending}
        disabled={!connectionId}
        onPress={() =>
          send.mutate({
            creatorId,
            connectionId,
            fileName,
            fileContentBase64: textToBase64(content),
          })
        }
      />
      {note ? <Text style={{ color: colors.muted, fontSize: 12 }}>{note}</Text> : null}
    </Section>
  );
}

export function kindsForCreator(creatorId: string): SpecialistToolKind[] {
  return specialistToolKinds(creatorId);
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  title: { fontSize: 16, fontWeight: "800" },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 13, minHeight: 44 },
  tall: { minHeight: 96, textAlignVertical: "top" },
  btn: { borderRadius: 10, padding: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "800" },
  row: { flexDirection: "row", gap: 6, paddingVertical: 4 },
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
});
