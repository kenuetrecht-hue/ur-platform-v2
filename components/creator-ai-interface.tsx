import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { getApiBaseUrl } from "@/constants/oauth";
import { isForgeSpecialist } from "@/lib/forge-specialists";
import { AFFILIATE_ASSOCIATE_ID } from "@/lib/affiliate-associate-catalog";
import { speakText } from "@/lib/azure-tts-service";
import { useRouter } from "expo-router";
import { useOverlapInsets } from "@/hooks/use-overlap-insets";
import { LAYOUT_OVERLAP } from "@/lib/layout-overlap";
import { useAiTalkMeterPlayback } from "@/hooks/use-ai-talk-meter-playback";
import { useNetworkConnectivity, isMeteringConnected } from "@/hooks/use-network-connectivity";
import { useAiChatSync, type SyncedChatMessage } from "@/hooks/use-ai-chat-sync";
import { useAiChatOutbox } from "@/hooks/use-ai-chat-outbox";
import { useAuth } from "@/lib/auth-context";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import { METER_HEARTBEAT_INTERVAL_MS } from "@/lib/ai-metering-policy";
import { buildAiChatDisclosure, AI_WELCOME_DISCLOSURE_SUFFIX } from "@/lib/platform-disclosure-copy";
import { brandDisclosureSurface, withAlpha } from "@/lib/brand-theme";
import { UsageUpgradePanel } from "@/components/usage-upgrade-panel";
import { UsageAllowanceBanner } from "@/components/usage-allowance-banner";
import { UsageTrackerDashboard } from "@/components/usage-tracker-dashboard";
import { AiTalkLowBalanceNotice } from "@/components/ai-talk-low-balance-notice";
import { AiTalkTimePanel } from "@/components/ai-talk-time-panel";
import { isTalkTimeLowBalance } from "@/lib/ai-talk-time-policy";
import type { ChatMessageAttachmentPreview, ChatSearchCitation } from "@/lib/chat-attachment-types";
import { AiChatSearchCitations } from "@/components/ai-chat-search-citations";
import { AiChatMessageMedia } from "@/components/ai-chat-message-media";
import { VoicePromptMicButton } from "@/components/voice-prompt-mic-button";
import { ThanksStampsWall } from "@/components/thanks-stamps-wall";

interface ChatMessage {
  role: "user" | "ai";
  text: string;
  id: string;
  /** Queued locally while offline — flushes when API is reachable. */
  pending?: boolean;
  attachments?: ChatMessageAttachmentPreview[];
  searchCitations?: ChatSearchCitation[];
  generatedImageUrl?: string;
}

export type CreatorAIInterfaceProps = {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  welcomeMessage?: string;
  initialPrompt?: string;
  onClose?: () => void;
  /** Hide the in-chat header when the parent screen already shows specialist info. */
  hideHeader?: boolean;
  /** Compact layout for the AIs tab — hides extra chrome, docks composer to message list. */
  embedded?: boolean;
  /** Fixed UI height above chat (for keyboard offset). Defaults to AIs tab estimate when embedded. */
  overlapHeaderHeight?: number;
};

export function CreatorAIInterface({
  creatorId,
  creatorName,
  creatorAvatar = "✨",
  welcomeMessage,
  initialPrompt,
  onClose,
  hideHeader = false,
  embedded = false,
  overlapHeaderHeight,
}: CreatorAIInterfaceProps) {
  const colors = useColors();
  const router = useRouter();
  const overlap = useOverlapInsets({
    reserveTabBar: embedded,
    headerChromeHeight: embedded
      ? (overlapHeaderHeight ?? LAYOUT_OVERLAP.AIS_TAB_CHROME_HEIGHT)
      : 0,
  });
  const defaultWelcome =
    welcomeMessage ??
    `Hi! I'm ${creatorName}, an AI assistant on UR Platform.\n\n${AI_WELCOME_DISCLOSURE_SUFFIX}\n\nHow can I help you today?`;
  const scrollViewRef = useRef<ScrollView>(null);
  const messageSeq = useRef(0);
  const loadingRef = useRef(false);
  const { isAuthenticated } = useAuth();

  const applySyncedMessages = useCallback(
    (synced: SyncedChatMessage[]) => {
      if (loadingRef.current || synced.length === 0) return;
      setMessages(
        synced.map((m) => ({
          id: m.id,
          role: m.role,
          text: m.text,
        })),
      );
    },
    [],
  );

  const { connected: chatSyncConnected, refetch: refetchChatThread } = useAiChatSync({
    creatorId,
    enabled: isAuthenticated,
    onSync: applySyncedMessages,
  });

  const { enqueue: enqueueOutbox } = useAiChatOutbox({
    creatorId,
    enabled: isAuthenticated,
    onFlushed: () => void refetchChatThread(),
  });

  const makeMessage = useCallback(
    (role: ChatMessage["role"], text: string): ChatMessage => {
      messageSeq.current += 1;
      return { role, text, id: `${creatorId}-${messageSeq.current}` };
    },
    [creatorId],
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "ai", text: defaultWelcome, id: `${creatorId}-welcome` },
  ]);
  const [inputText, setInputText] = useState("");
  const [speechHint, setSpeechHint] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PickedChatAttachment[]>([]);
  const [imageGenPrompt, setImageGenPrompt] = useState("");
  const [showImageGen, setShowImageGen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hiveMode, setHiveMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [awaitingPitchConsent, setAwaitingPitchConsent] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [showTalkTopUp, setShowTalkTopUp] = useState(false);
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);
  const [aiReachable, setAiReachable] = useState<boolean | null>(null);
  const [aiHint, setAiHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const base = getApiBaseUrl();
    if (!base) {
      setApiReachable(false);
      return;
    }
    fetch(`${base}/api/health`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setApiReachable(false);
          return;
        }
        setApiReachable(true);
        const body = (await res.json()) as {
          ai?: { reachable?: boolean; hint?: string };
        };
        setAiReachable(body.ai?.reachable ?? null);
        setAiHint(body.ai?.hint ?? null);
      })
      .catch(() => {
        if (!cancelled) setApiReachable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function formatChatError(error: unknown): string {
    const fromTrpc =
      typeof error === "object" &&
      error &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
        ? String((error as { message: string }).message)
        : "";
    const raw =
      error instanceof Error
        ? error.message
        : fromTrpc || "Unknown error";
    if (/fetch|network|failed to connect|ECONNREFUSED/i.test(raw)) {
      return (
        `Cannot reach the API at ${getApiBaseUrl() || "(not configured)"}. ` +
        `Stop other dev servers, run node scripts/free-dev-ports.mjs, then pnpm dev. ` +
        `The API must listen on port 3000.`
      );
    }
    if (/unexpected error occurred|upstream service error/i.test(raw)) {
      return (
        "The AI server hit an error (often a Gemini model or API key issue). " +
        "Check the terminal running pnpm dev for [google-ai] logs, then reload the app."
      );
    }
    if (/rate limit|429|quota/i.test(raw)) {
      return (
        "Gemini free-tier quota reached. Wait 2 minutes, check https://ai.dev/rate-limit, or create a new API key at https://aistudio.google.com/apikey"
      );
    }
    if (/invalid|api key/i.test(raw)) {
      return (
        "Gemini API key is invalid. Create a key at https://aistudio.google.com/apikey, " +
        "update CONTENTMATE_GEMINI_API_KEY in .env, save, then restart pnpm dev."
      );
    }
    return raw || "Sorry, I encountered an error. Please try again.";
  }

  const chatMutation = trpc.aiCreators.sendMessage.useMutation();
  const imageGenMutation = trpc.aiCreators.generateImage.useMutation();
  const voiceMutation = trpc.aiCreators.synthesizeVoice.useMutation();
  const premium = trpc.aiCreators.premiumMediaStatus.useQuery();
  const talkStatus = trpc.aiTalk.getStatus.useQuery();
  const buyTalk = trpc.aiTalk.purchase.useMutation({
    onSuccess: () => {
      void premium.refetch();
      void talkStatus.refetch();
    },
  });
  const buyVideo = trpc.aiTalk.purchase.useMutation({
    onSuccess: () => {
      void premium.refetch();
      void talkStatus.refetch();
    },
  });
  const buyAffiliateVoice = trpc.partnerDashboard.purchaseAffiliateVoice.useMutation({
    onSuccess: () => void premium.refetch(),
  });
  const assertVideo = trpc.aiCreators.assertVideoTalkAccess.useMutation();
  const [videoActive, setVideoActive] = useState(false);
  const [videoMeterSessionId, setVideoMeterSessionId] = useState<string | null>(null);
  const { playMeteredAudio } = useAiTalkMeterPlayback();
  const meterConnectivity = useNetworkConnectivity();
  const meterHeartbeat = trpc.aiTalk.meterHeartbeat.useMutation();
  const meterFinalize = trpc.aiTalk.meterFinalize.useMutation();
  const hiveProfile = trpc.aiCreators.getHiveProfile.useQuery({ creatorId });
  const handoffs = trpc.aiCreators.getHandoffs.useQuery({ creatorId });
  const isAssociateAi = creatorId === AFFILIATE_ASSOCIATE_ID;
  const { isPlatformOwner } = usePlatformOwner();
  const talkMinutes = talkStatus.data?.minutesRemaining ?? premium.data?.talkMinutesRemaining ?? 0;
  const talkMsLeft = talkStatus.data?.millisecondsRemaining ?? talkMinutes * 60_000;
  const talkLoseBy = talkStatus.data?.earliestLoseByLabel;
  const ownerTalkIncluded = isPlatformOwner || talkStatus.data?.ownerComplimentary === true;
  const hasTalkTime = ownerTalkIncluded || talkStatus.data?.hasTalkAccess === true || talkMinutes > 0;
  const talkLowBalance = ownerTalkIncluded ? false : (talkStatus.data?.lowBalance ?? isTalkTimeLowBalance(talkMsLeft));
  const supportsVoice = isForgeSpecialist(creatorId) || isAssociateAi || hasTalkTime;
  const forgeEmbedded = embedded && isForgeSpecialist(creatorId);
  const showVoiceHiveControls = !embedded || forgeEmbedded;
  const hasPaidVoice =
    isAssociateAi
      ? Boolean(premium.data?.affiliateVoice)
      : creatorId === "contentmate"
        ? Boolean(premium.data?.creatorVoice)
        : true;

  useEffect(() => {
    if (forgeEmbedded) setShowExtras(true);
  }, [forgeEmbedded]);

  useEffect(() => {
    messageSeq.current = 0;
    const welcome =
      welcomeMessage ??
      `Hi! I'm ${creatorName}. I understand any language — ask me anything in my area of expertise.`;
    setMessages([makeMessage("ai", welcome)]);
    setInputText(initialPrompt ?? "");
    setLoading(false);
    setSendStatus(null);
  }, [creatorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [sendStatus, setSendStatus] = useState<string | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const CHAT_TIMEOUT_MS = 45_000;

  const supportsPhotoAnalysis = Boolean(hiveProfile.data?.capabilities.photoAnalysis);
  const supportsImageGen = Boolean(hiveProfile.data?.capabilities.imageGeneration);

  const sendChatMessage = useCallback(
    async (rawText: string, attachmentOverride?: PickedChatAttachment[]) => {
      const userMessage = rawText.trim().slice(0, 2000);
      const attachmentsToSend = attachmentOverride ?? pendingAttachments;
      if ((!userMessage && attachmentsToSend.length === 0) || loading) return;

      const displayText =
        userMessage ||
        (attachmentsToSend.length === 1
          ? `[Attached ${attachmentsToSend[0]?.fileName ?? attachmentsToSend[0]?.mimeType}]`
          : `[Attached ${attachmentsToSend.length} files]`);

      loadingRef.current = true;
      setLoading(true);
      setSendStatus("Sending…");
      const clearedInput = rawText === inputText;
      if (clearedInput) {
        setInputText("");
      }
      if (!attachmentOverride) {
        setPendingAttachments([]);
      }

      if (isAuthenticated && !chatSyncConnected) {
        if (attachmentsToSend.length > 0) {
          setSendStatus("Attachments require an online connection.");
          loadingRef.current = false;
          setLoading(false);
          return;
        }
        const item = await enqueueOutbox({
          creatorId,
          message: userMessage,
          channel: "creators",
          useHiveConsult: hiveMode,
        });
        setMessages((prev) => [
          ...prev,
          { ...makeMessage("user", userMessage), id: item.id, pending: true },
        ]);
        setSendStatus("Queued — sends when you're back online");
        scrollToBottom();
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          ...makeMessage("user", displayText),
          attachments: attachmentsToSend.map((a) => ({
            mimeType: a.mimeType,
            previewUri: a.previewUri,
            fileName: a.fileName,
          })),
        },
      ]);
      scrollToBottom();

      try {
        const priorTurns = messages
          .filter((m) => m.role === "user" || m.role === "ai")
          .slice(-10)
          .map((m) => ({
            role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
            content: m.text,
          }));
        while (priorTurns.length > 0 && priorTurns[0]?.role === "assistant") {
          priorTurns.shift();
        }

        const result = await Promise.race([
          chatMutation.mutateAsync({
            creatorId,
            message: userMessage || "Please analyze the attached file(s).",
            history: priorTurns,
            useHiveConsult: hiveMode,
            attachments: attachmentsToSend.length
              ? attachmentsToSend.map((a) => ({
                  mimeType: a.mimeType,
                  base64: a.base64,
                  fileName: a.fileName,
                }))
              : undefined,
          }),
          new Promise<never>((_, reject) => {
            setTimeout(
              () =>
                reject(
                  new Error(
                    `Request timed out after ${CHAT_TIMEOUT_MS / 1000}s. ` +
                      `Is the API running? Run: node scripts/free-dev-ports.mjs then pnpm dev`,
                  ),
                ),
              CHAT_TIMEOUT_MS,
            );
          }),
        ]);

        let replyText = result.reply;
        if (result.commissionedWorks?.length) {
          replyText += `\n\n📋 Steward assigned work:\n${result.commissionedWorks
            .map((w) => `• ${w.specialistName} — ${w.title} (${w.status})`)
            .join("\n")}`;
        } else if (result.hiveConsulted?.length) {
          replyText += `\n\n🐝 Hive consulted: ${result.hiveConsulted.map((p) => p.name).join(", ")}`;
        }

        setMessages((prev) => [
          ...prev,
          {
            ...makeMessage("ai", replyText),
            searchCitations: result.searchResults,
          },
        ]);
        setAwaitingPitchConsent(Boolean(result.pitchConsentRequest));
        setSendStatus(null);
        void refetchChatThread();
      } catch (error) {
        const errText = formatChatError(error);
        setMessages((prev) => [...prev, makeMessage("ai", errText)]);
        setSendStatus(errText.slice(0, 120));
        if (clearedInput) {
          setInputText(userMessage);
        }
      } finally {
        loadingRef.current = false;
        setLoading(false);
        scrollToBottom();
      }
    },
    [
      chatMutation,
      chatSyncConnected,
      creatorId,
      enqueueOutbox,
      hiveMode,
      inputText,
      isAuthenticated,
      loading,
      makeMessage,
      messages,
      pendingAttachments,
      scrollToBottom,
      refetchChatThread,
    ],
  );

  const attachFiles = useCallback(async () => {
    if (!supportsPhotoAnalysis || loading) return;
    try {
      const picked = await pickChatAttachments();
      if (picked.length === 0) return;
      setPendingAttachments((prev) => [...prev, ...picked].slice(0, 2));
    } catch (error) {
      setSendStatus(error instanceof Error ? error.message : "Could not attach file.");
    }
  }, [loading, supportsPhotoAnalysis]);

  const generateImageFromPrompt = useCallback(async () => {
    const prompt = (imageGenPrompt || inputText).trim().slice(0, 2000);
    if (!prompt || !supportsImageGen || imageGenMutation.isPending || loading) return;

    setLoading(true);
    setSendStatus("Generating image…");
    setMessages((prev) => [...prev, makeMessage("user", `Generate image: ${prompt}`)]);

    try {
      const result = await imageGenMutation.mutateAsync({
        creatorId,
        prompt,
        aspectRatio: "1:1",
      });
      setMessages((prev) => [
        ...prev,
        {
          ...makeMessage("ai", "Here is your generated image. You own the prompt; verify rights before commercial use."),
          generatedImageUrl: result.url,
        },
      ]);
      setImageGenPrompt("");
      setShowImageGen(false);
      setSendStatus(null);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        makeMessage("ai", formatChatError(error)),
      ]);
      setSendStatus(formatChatError(error).slice(0, 120));
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [
    creatorId,
    formatChatError,
    imageGenMutation,
    imageGenPrompt,
    inputText,
    loading,
    makeMessage,
    scrollToBottom,
    supportsImageGen,
  ]);

  const speakLastReply = useCallback(async () => {
    const lastAi = [...messages].reverse().find((m) => m.role === "ai");
    if (!lastAi?.text || voiceMutation.isPending) return;

    if (isAssociateAi && !hasPaidVoice) {
      try {
        await buyAffiliateVoice.mutateAsync();
      } catch (error) {
        setVoiceStatus(error instanceof Error ? error.message : "Could not purchase voice pack");
        return;
      }
    } else if (!isAssociateAi && !hasTalkTime) {
      setVoiceStatus(
        "Purchase talk time first — $5 in the app (20 min), $1 on web (5 min), $120 on web (500 min), or $200 on web (1,000 min). Open AI Talk Time below.",
      );
      return;
    }

    setVoiceStatus(null);
    try {
      const result = await voiceMutation.mutateAsync({
        creatorId,
        text: lastAi.text.slice(0, 3000),
      });
      if (result.success) {
        if (result.meterSessionId && result.audioUrl?.startsWith("data:")) {
          setVoiceStatus(`🔊 ${result.persona} — playing (metered to the ms)`);
          await playMeteredAudio({
            meterSessionId: result.meterSessionId,
            audioUrl: result.audioUrl,
            durationMs: result.durationMs ?? Math.round(result.duration * 1000),
            onStatus: setVoiceStatus,
          });
        } else if (typeof window !== "undefined" && result.audioUrl?.startsWith("data:")) {
          const audio = new window.Audio(result.audioUrl);
          void audio.play();
          setVoiceStatus(`🔊 ${result.persona} — ${Math.round(result.duration)}s audio ready`);
        } else if (Platform.OS !== "web") {
          await speakText(lastAi.text);
          setVoiceStatus(`🔊 ${result.persona} — native voice`);
        }
      } else {
        setVoiceStatus(result.error ?? "Voice unavailable");
      }
    } catch (error) {
      setVoiceStatus(error instanceof Error ? error.message : "Voice failed");
    }
  }, [buyAffiliateVoice, creatorId, hasPaidVoice, hasTalkTime, isAssociateAi, messages, playMeteredAudio, voiceMutation]);

  useEffect(() => {
    if (!videoActive || !videoMeterSessionId) return;

    const tick = () => {
      const connected = isMeteringConnected(meterConnectivity);
      void meterHeartbeat.mutateAsync({
        sessionId: videoMeterSessionId,
        playbackPositionMs: 0,
        clientOnline: connected,
      });
    };

    tick();
    const interval = setInterval(tick, METER_HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [videoActive, videoMeterSessionId, meterConnectivity, meterHeartbeat]);

  const stopVideoTalk = useCallback(async () => {
    if (videoMeterSessionId) {
      try {
        await meterFinalize.mutateAsync({
          sessionId: videoMeterSessionId,
          playbackPositionMs: 0,
        });
        void talkStatus.refetch();
      } catch {
        /* session may already be finalized */
      }
    }
    setVideoMeterSessionId(null);
    setVideoActive(false);
  }, [meterFinalize, talkStatus, videoMeterSessionId]);

  const startVideoTalk = useCallback(async () => {
    try {
      if (!hasTalkTime) {
        setVoiceStatus(
          "Purchase talk time first — $5 in the mobile app (20 min), $1 on web (5 min), $120 on web (500 min), or $200 on web (1,000 min).",
        );
        return;
      }
      const access = await assertVideo.mutateAsync({ creatorId });
      if (access.meterSessionId) {
        setVideoMeterSessionId(access.meterSessionId);
      }
      setVideoActive(true);
      setVoiceStatus("📹 Video talk — billed only while connected");
    } catch (error) {
      setVoiceStatus(error instanceof Error ? error.message : "Video talk unavailable");
    }
  }, [assertVideo, creatorId, hasTalkTime]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, embedded && styles.rootEmbedded]}
      behavior={embedded && Platform.OS === "ios" ? overlap.keyboardBehavior : undefined}
      keyboardVerticalOffset={embedded && Platform.OS === "ios" ? overlap.keyboardVerticalOffset : 0}
    >
      <View style={styles.column}>
      {!hideHeader ? (
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerAvatar}>{creatorAvatar}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {creatorName}
          </Text>
          {onClose ? (
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
              <Text style={styles.headerTitle}>✕</Text>
            </Pressable>
          ) : (
            <View style={styles.closePlaceholder} />
          )}
        </View>
      </View>
      ) : null}

      <View
        style={[
          styles.disclosureBanner,
          brandDisclosureSurface(colors),
        ]}
        accessibilityRole="text"
        accessibilityLabel={buildAiChatDisclosure(creatorName)}
      >
        <Text
          style={{
            color: withAlpha(colors.muted, 0.92),
            fontSize: 10,
            lineHeight: 14,
            textAlign: "center",
            letterSpacing: 0.12,
            opacity: 0.85,
          }}
          numberOfLines={4}
        >
          {buildAiChatDisclosure(creatorName)}
        </Text>
      </View>

      <ThanksStampsWall targetType="ai" targetId={creatorId} targetName={creatorName} compact />

      {!embedded && apiReachable === false ? (
        <View
          style={[
            styles.apiBanner,
            { backgroundColor: `${colors.error}18`, borderColor: colors.error },
          ]}
        >
          <Text style={{ color: colors.error, fontSize: 11, lineHeight: 16, textAlign: "center" }}>
            API offline — chat cannot send. Run node scripts/free-dev-ports.mjs then pnpm dev. Expected:{" "}
            {getApiBaseUrl() || "set EXPO_PUBLIC_API_BASE_URL in .env"}
          </Text>
        </View>
      ) : null}

      {!embedded && apiReachable === true && aiReachable === false ? (
        <View
          style={[
            styles.apiBanner,
            { backgroundColor: `${colors.error}18`, borderColor: colors.error },
          ]}
        >
          <Text style={{ color: colors.error, fontSize: 11, lineHeight: 16, textAlign: "center" }}>
            {aiHint ??
              "Gemini AI key invalid. Get a key at aistudio.google.com/apikey, update .env, restart pnpm dev."}
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.chatBody,
          embedded && {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            backgroundColor: colors.surface,
          },
        ]}
      >
        {!embedded && hiveProfile.data ? (
          <View style={[styles.hiveInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              Hive: {hiveProfile.data.hivePeers.length} peers ·{" "}
              {hiveProfile.data.supportsHiveConsult ? "consult enabled" : "solo mode"}
              {hiveProfile.data.capabilities.webSearch ? " · web search" : ""}
              {hiveProfile.data.capabilities.photoAnalysis ? " · photo/PDF" : ""}
              {hiveProfile.data.capabilities.imageGeneration ? " · image gen" : ""}
            </Text>
          </View>
        ) : null}

        <UsageAllowanceBanner creatorId={creatorId} creatorName={creatorName} />
        <UsageTrackerDashboard creatorId={creatorId} compact />

        <ScrollView
          ref={scrollViewRef}
          style={styles.messages}
          contentContainerStyle={[
            styles.messagesContent,
            { paddingBottom: 16 + overlap.scrollPaddingBottom },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.bubble,
                msg.role === "user"
                  ? [styles.userBubble, { backgroundColor: colors.primary }]
                  : [styles.aiBubble, { backgroundColor: colors.background, borderColor: colors.border }],
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  { color: msg.role === "user" ? "#fff" : colors.foreground },
                ]}
              >
                {msg.text}
              </Text>
              <AiChatMessageMedia
                attachments={msg.attachments}
                generatedImageUrl={msg.generatedImageUrl}
              />
              {msg.role === "ai" && msg.searchCitations?.length ? (
                <AiChatSearchCitations citations={msg.searchCitations} />
              ) : null}
            </View>
          ))}
          {loading ? (
            <View style={styles.typingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.muted, fontSize: 13 }}>Waiting for reply…</Text>
            </View>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.composerDock,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
              paddingBottom: overlap.dockPaddingBottom,
            },
          ]}
        >
          {showVoiceHiveControls && !isAssociateAi && talkLowBalance ? (
            <AiTalkLowBalanceNotice
              millisecondsRemaining={talkMsLeft}
              onReUp={() => {
                setShowTalkTopUp(true);
                setShowExtras(true);
              }}
            />
          ) : null}
          {showVoiceHiveControls && showTalkTopUp ? (
            <AiTalkTimePanel creatorName={creatorName} showPurchase />
          ) : null}

          {showVoiceHiveControls ? (
            <Pressable
              onPress={() => setShowExtras((v) => !v)}
              style={[styles.extrasToggle, { borderColor: colors.border, backgroundColor: colors.surface }]}
              hitSlop={4}
            >
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600" }}>
                {showExtras ? "Hide voice, hive & extras" : "Voice, hive & extras"}
              </Text>
            </Pressable>
          ) : null}

          {showVoiceHiveControls && showExtras ? (
        <>
          {!isAssociateAi ? (
            <Pressable
              onPress={() => setHiveMode((v) => !v)}
              style={[
                styles.hiveToggle,
                { borderColor: colors.border, backgroundColor: hiveMode ? colors.primary : colors.surface },
              ]}
            >
              <Text style={{ color: hiveMode ? "#fff" : colors.foreground, fontSize: 12, fontWeight: "600" }}>
                {hiveMode ? "🐝 Hive mode ON" : "🐝 Hive mode — consult peer specialists"}
              </Text>
            </Pressable>
          ) : null}

          {supportsVoice ? (
            <Pressable
              onPress={() => void speakLastReply()}
              disabled={voiceMutation.isPending || loading || buyAffiliateVoice.isPending}
              style={[styles.hiveToggle, { borderColor: colors.border, backgroundColor: colors.surface, marginTop: 0 }]}
            >
              <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "600" }}>
                {voiceMutation.isPending || buyAffiliateVoice.isPending
                  ? "🎙️ Synthesizing voice…"
                  : isAssociateAi
                    ? hasPaidVoice
                      ? "🎙️ Hear Associate AI"
                      : `🎙️ Voice pack $${premium.data?.affiliateVoicePriceUsd ?? "2.99"}`
                    : hasTalkTime
                      ? ownerTalkIncluded
                        ? "🎙️ Voice — included (owner)"
                        : `🎙️ Voice — ${talkMinutes} min left${talkLowBalance ? " · last 5 min, re-up now" : ""}${talkLoseBy ? ` · ${talkLoseBy}` : " · use within 30 days or it is lost"}`
                      : "🎙️ Voice — buy talk time"}
              </Text>
              {voiceStatus ? (
                <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{voiceStatus}</Text>
              ) : null}
            </Pressable>
          ) : null}

          {!isAssociateAi ? (
            <Pressable
              onPress={() => void (videoActive ? stopVideoTalk() : startVideoTalk())}
              disabled={assertVideo.isPending || buyVideo.isPending}
              style={[
                styles.hiveToggle,
                {
                  borderColor: colors.border,
                  backgroundColor: videoActive ? colors.primary : colors.surface,
                  marginTop: 0,
                },
              ]}
            >
              <Text style={{ color: videoActive ? "#fff" : colors.foreground, fontSize: 12, fontWeight: "600" }}>
                {videoActive ? "📹 Video talk ON" : ownerTalkIncluded ? "📹 Video talk — included (owner)" : "📹 Video talk"}
              </Text>
            </Pressable>
          ) : null}

          {handoffs.data?.suggestions.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 52, marginVertical: 4 }}>
              <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 8 }}>
                {handoffs.data.suggestions.map((h) => (
                  <Pressable
                    key={h.targetCreatorId}
                    onPress={() => {
                      if (h.route.startsWith("/3d")) {
                        router.push("/3d-workspace" as never);
                      } else {
                        router.push({
                          pathname: "/(tabs)/ais",
                          params: { ai: h.targetCreatorId, prompt: h.prefillPrompt },
                        } as never);
                      }
                    }}
                    style={{
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: colors.surface,
                    }}
                  >
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700" }}>
                      → {h.targetName}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          ) : null}
        </>
          ) : null}

          {awaitingPitchConsent ? (
            <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 4, paddingBottom: 6 }}>
              <Pressable
                onPress={() => {
                  setAwaitingPitchConsent(false);
                  void sendChatMessage("yes");
                }}
                style={[styles.pitchBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Yes — show offer</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setAwaitingPitchConsent(false);
                  void sendChatMessage("no");
                }}
                style={[styles.pitchBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>No thanks</Text>
              </Pressable>
            </View>
          ) : null}

          {sendStatus ? (
            <View
              style={[
                styles.sendStatus,
                {
                  backgroundColor: loading ? `${colors.primary}18` : `${colors.error}18`,
                  borderColor: loading ? colors.primary : colors.error,
                },
              ]}
            >
              {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
              <Text
                style={{
                  flex: 1,
                  color: loading ? colors.primary : colors.error,
                  fontSize: 12,
                  lineHeight: 16,
                }}
              >
                {sendStatus}
              </Text>
            </View>
          ) : null}

          {embedded && apiReachable === false ? (
            <Text style={{ color: colors.error, fontSize: 11, paddingHorizontal: 4, paddingBottom: 6 }}>
              API offline — run pnpm dev on your PC
            </Text>
          ) : null}

          {pendingAttachments.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 4, paddingBottom: 6 }}>
              {pendingAttachments.map((att, i) => (
                <View
                  key={`pending-${i}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  }}
                >
                  <Text style={{ color: colors.foreground, fontSize: 11 }} numberOfLines={1}>
                    {att.mimeType.startsWith("image/") ? "🖼" : "📄"}{" "}
                    {att.fileName ?? att.mimeType}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setPendingAttachments((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    hitSlop={6}
                  >
                    <Text style={{ color: colors.error, fontSize: 12 }}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {supportsImageGen && showImageGen ? (
            <View style={{ paddingHorizontal: 4, paddingBottom: 6, gap: 6 }}>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.foreground,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    minHeight: 44,
                  },
                ]}
                placeholder="Describe the image to generate…"
                placeholderTextColor={colors.muted}
                value={imageGenPrompt}
                onChangeText={setImageGenPrompt}
                maxLength={2000}
              />
              <Pressable
                onPress={() => void generateImageFromPrompt()}
                disabled={loading || imageGenMutation.isPending}
                style={[styles.hiveToggle, { borderColor: colors.border, backgroundColor: colors.primary, marginTop: 0 }]}
              >
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
                  {imageGenMutation.isPending ? "Generating…" : "🎨 Generate image (Imagen)"}
                </Text>
              </Pressable>
              <UsageUpgradePanel
                productId="images-imagen"
                creatorId={creatorId}
                title="Image credits & upgrades"
              />
            </View>
          ) : null}

          {supportsPhotoAnalysis && pendingAttachments.length > 0 ? (
            <UsageUpgradePanel
              productId="images-vision"
              creatorId={creatorId}
              title="Photo/PDF analysis credits"
              compact={false}
            />
          ) : null}

          <View style={styles.inputRow}>
            {supportsPhotoAnalysis ? (
              <Pressable
                onPress={() => void attachFiles()}
                disabled={loading || pendingAttachments.length >= 2}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.attachButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={{ fontSize: 18 }}>📎</Text>
              </Pressable>
            ) : null}
            <VoicePromptMicButton
              disabled={loading}
              onTranscript={(text, hint) => {
                if (text) setInputText(text.slice(0, 2000));
                setSpeechHint(hint || null);
              }}
            />
            {supportsImageGen ? (
              <Pressable
                onPress={() => setShowImageGen((v) => !v)}
                disabled={loading}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.attachButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: showImageGen ? colors.primary : colors.surface,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={{ fontSize: 16 }}>🎨</Text>
              </Pressable>
            ) : null}
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Type, or tap 🎤 and speak any language…"
              placeholderTextColor={colors.muted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              editable={!loading}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={() => {
                if ((inputText.trim() || pendingAttachments.length > 0) && !loading) {
                  void sendChatMessage(inputText);
                }
              }}
            />
            <Pressable
              onPress={() => void sendChatMessage(inputText)}
              disabled={loading || (!inputText.trim() && pendingAttachments.length === 0)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor:
                    loading || (!inputText.trim() && pendingAttachments.length === 0)
                      ? colors.muted
                      : colors.primary,
                  opacity: pressed ? 0.85 : 1,
                  minWidth: 72,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.sendLabel}>Send</Text>
              )}
            </Pressable>
          </View>
          {speechHint ? (
            <Text style={{ color: colors.muted, fontSize: 11, paddingTop: 6 }}>{speechHint}</Text>
          ) : (
            <Text style={{ color: colors.muted, fontSize: 11, paddingTop: 6 }}>
              Microphone hears any language and prints English when needed.
            </Text>
          )}
        </View>
      </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, overflow: "hidden" },
  rootEmbedded: { width: "100%" },
  column: { flex: 1, minHeight: 0, overflow: "hidden" },
  chatBody: { flex: 1, minHeight: 0, overflow: "hidden" },
  composerDock: {
    flexShrink: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: { fontSize: 22 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: "#fff" },
  hiveInfo: {
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  closeButton: { padding: 4 },
  closePlaceholder: { width: 28 },
  messages: { flex: 1, minHeight: 0 },
  messagesContent: { padding: 12, paddingBottom: 16, gap: 10 },
  typingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  bubble: { maxWidth: "88%", borderRadius: 16, padding: 12 },
  userBubble: { alignSelf: "flex-end" },
  aiBubble: { alignSelf: "flex-start", borderWidth: 1 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  hiveToggle: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  extrasToggle: {
    marginHorizontal: 12,
    marginBottom: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  pitchBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  sendStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingTop: 4,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  apiBanner: {
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  disclosureBanner: {
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendButton: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  sendLabel: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
