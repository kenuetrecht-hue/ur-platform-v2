import { Platform } from "react-native";

const CALL_RING_CHANNEL_ID = "ur-incoming-call";
const notifiedRooms = new Set<string>();

let audioCtx: AudioContext | null = null;
let ringTimer: ReturnType<typeof setInterval> | null = null;

function audioContextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const webkit = (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return window.AudioContext ?? webkit ?? null;
}

/** Browsers block sound until the person has tapped the page. */
export function unlockCallRingtone(): void {
  const Ctor = audioContextCtor();
  if (!Ctor) return;
  if (!audioCtx) audioCtx = new Ctor();
  void audioCtx.resume().catch(() => undefined);
}

function playRingBurst(ctx: AudioContext): void {
  const tones: Array<[number, number]> = [
    [440, 0],
    [480, 0.42],
  ];
  for (const [frequency, startAt] of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + startAt;
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.34);
  }
}

export function startCallRingtone(): void {
  unlockCallRingtone();
  if (!audioCtx || ringTimer != null) return;
  const ctx = audioCtx;
  const beep = () => {
    if (ctx.state === "closed") return;
    if (ctx.state === "suspended") {
      void ctx.resume().then(() => playRingBurst(ctx)).catch(() => undefined);
      return;
    }
    playRingBurst(ctx);
  };
  beep();
  ringTimer = setInterval(beep, 2000);
}

export function stopCallRingtone(): void {
  if (ringTimer != null) {
    clearInterval(ringTimer);
    ringTimer = null;
  }
}

export function showForegroundCallNotice(roomId: string, body: string): void {
  if (notifiedRooms.has(roomId)) return;
  notifiedRooms.add(roomId);
  if (Platform.OS === "web") {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try {
      new Notification("Incoming video call", {
        body,
        requireInteraction: true,
        tag: "ur-video-call",
      });
    } catch {
      /* the in-app banner and ringtone still run */
    }
    return;
  }
  void presentNativeCallNotice(body);
}

async function presentNativeCallNotice(body: string): Promise<void> {
  try {
    const Notifications = await import("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) return;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CALL_RING_CHANNEL_ID, {
        name: "Incoming video calls",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500, 200, 700],
        enableVibrate: true,
        sound: "default",
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Incoming video call",
        body,
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: { route: "/messages", kind: "video_call" },
      },
      trigger: null,
    });
  } catch {
    /* banner still shows inside the app */
  }
}

export async function ensureCallRingPermission(): Promise<void> {
  if (Platform.OS !== "web" || typeof Notification === "undefined") return;
  if (Notification.permission !== "default") return;
  try {
    await Notification.requestPermission();
  } catch {
    /* denied or unsupported */
  }
}

function sameKey(existing: ArrayBuffer | null | undefined, next: Uint8Array): boolean {
  if (!existing) return false;
  const current = new Uint8Array(existing);
  if (current.length !== next.length) return false;
  for (let i = 0; i < current.length; i += 1) {
    if (current[i] !== next[i]) return false;
  }
  return true;
}

function urlBase64ToUint8Array(value: string): Uint8Array {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export async function subscribeCallRing(params: {
  publicKey: string;
  register: (subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }) => Promise<unknown>;
}): Promise<boolean> {
  if (Platform.OS !== "web") return false;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  if (!params.publicKey) return false;
  await ensureCallRingPermission();
  if (typeof Notification !== "undefined" && Notification.permission !== "granted") return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const applicationServerKey = urlBase64ToUint8Array(params.publicKey);
    let subscription = await registration.pushManager.getSubscription();
    if (subscription && !sameKey(subscription.options?.applicationServerKey, applicationServerKey)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });
    }
    const json = subscription.toJSON();
    const endpoint = json.endpoint ?? "";
    const p256dh = json.keys?.p256dh ?? "";
    const auth = json.keys?.auth ?? "";
    if (!endpoint.startsWith("https://") || !p256dh || !auth) return false;
    await params.register({ endpoint, keys: { p256dh, auth } });
    return true;
  } catch {
    return false;
  }
}
