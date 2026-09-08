import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import {
  PLATFORM_SEARCH_EMPTY_HINT,
  PLATFORM_SEARCH_KIND_LABEL,
  PLATFORM_SEARCH_KINDS,
  PLATFORM_SEARCH_PLACEHOLDER,
  PLATFORM_SEARCH_QUERY_MAX,
  PLATFORM_SEARCH_RULE,
  PLATFORM_SEARCH_RULE_SHORT,
  PLATFORM_SEARCH_TITLE,
  type PlatformSearchKind,
} from "@/lib/platform-search-policy";

const KIND_EMOJI: Record<PlatformSearchKind, string> = {
  specialist: "🤖",
  creator: "👤",
  ai_board: "📌",
  post: "💬",
  video: "▶",
  shop: "🛍️",
};

export function PlatformSearchPanel({ compact = false }: { compact?: boolean }) {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<PlatformSearchKind | undefined>();

  useEffect(() => {
    const handle = setTimeout(() => setQuery(draft.trim()), 220);
    return () => clearTimeout(handle);
  }, [draft]);

  const suggest = trpc.platformSearch.suggest.useQuery(undefined, { enabled: isAuthenticated });
  const results = trpc.platformSearch.search.useQuery(
    { query, kind, limit: compact ? 8 : 24 },
    { enabled: isAuthenticated && query.length >= 2 },
  );

  const chips = useMemo(
    () => [{ id: undefined, label: "All" }, ...PLATFORM_SEARCH_KINDS.map((id) => ({ id, label: PLATFORM_SEARCH_KIND_LABEL[id] }))],
    [],
  );

  if (compact) {
    return (
      <Pressable
        onPress={() => router.push("/discover/search")}
        style={[styles.compact, { borderColor: colors.primary, backgroundColor: colors.surface }]}
      >
        <Text style={{ fontSize: 20 }}>🔍</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.foreground, fontWeight: "800" }}>{PLATFORM_SEARCH_TITLE}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 16 }}>{PLATFORM_SEARCH_RULE_SHORT}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        {results.data?.rule ?? PLATFORM_SEARCH_RULE}
      </Text>
      {!isAuthenticated ? (
        <Pressable onPress={() => router.push("/login")}>
          <Text style={{ color: colors.primary, fontWeight: "800" }}>Sign in to search inside UR</Text>
        </Pressable>
      ) : null}

      <View style={[styles.box, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>UR INDEX</Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={PLATFORM_SEARCH_PLACEHOLDER}
          placeholderTextColor={colors.muted}
          maxLength={PLATFORM_SEARCH_QUERY_MAX}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
        />
        <Text style={{ color: colors.muted, fontSize: 10 }}>
          {draft.length}/{PLATFORM_SEARCH_QUERY_MAX} · inside UR only · not the web
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {chips.map((chip) => {
          const active = kind === chip.id;
          return (
            <Pressable
              key={chip.label}
              onPress={() => setKind(chip.id)}
              style={[
                styles.chip,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? `${colors.primary}20` : colors.background,
                },
              ]}
            >
              <Text style={{ color: active ? colors.primary : colors.foreground, fontWeight: "700", fontSize: 12 }}>
                {chip.label}
                {chip.id && results.data?.counts[chip.id] ? ` ${results.data.counts[chip.id]}` : ""}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {query.length < 2 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{PLATFORM_SEARCH_EMPTY_HINT}</Text>
          <View style={styles.starters}>
            {(suggest.data?.starters ?? ["electrician", "Spanish", "guitar", "leak"]).map((starter) => (
              <Pressable
                key={starter}
                onPress={() => {
                  setDraft(starter);
                  setQuery(starter);
                }}
                style={[styles.starter, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>{starter}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : results.isFetching ? (
        <ActivityIndicator color={colors.primary} />
      ) : (results.data?.hits.length ?? 0) === 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>Nothing on UR matches that yet.</Text>
          {results.data?.didYouMean ? (
            <Pressable
              onPress={() => {
                setDraft(results.data!.didYouMean!);
                setQuery(results.data!.didYouMean!);
              }}
            >
              <Text style={{ color: colors.primary, fontWeight: "800" }}>
                Did you mean {results.data.didYouMean}?
              </Text>
            </Pressable>
          ) : null}
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
            {results.data?.emptyHint} This box does not search the internet.
          </Text>
        </View>
      ) : (
        results.data!.hits.map((hit) => (
          <Pressable
            key={hit.id}
            onPress={() => router.push(hit.href as never)}
            style={[styles.hit, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={{ fontSize: 20 }}>{KIND_EMOJI[hit.kind]}</Text>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "800" }}>
                {PLATFORM_SEARCH_KIND_LABEL[hit.kind]}
                {hit.category ? ` · ${hit.category}` : ""}
              </Text>
              <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>{hit.title}</Text>
              {hit.subtitle ? (
                <Text style={{ color: colors.muted, fontSize: 12 }}>{hit.subtitle}</Text>
              ) : null}
              {hit.snippet ? (
                <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 18 }}>{hit.snippet}</Text>
              ) : null}
              <Text style={{ color: colors.muted, fontSize: 10 }}>{hit.reasons.join(" · ")}</Text>
            </View>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  compact: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  box: { borderWidth: 1.5, borderRadius: 16, padding: 12, gap: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, fontWeight: "600" },
  chips: { gap: 8, paddingRight: 8 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  starters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  starter: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  hit: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: "row", gap: 10, alignItems: "flex-start" },
});
