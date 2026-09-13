import { Platform, Share } from "react-native";
import * as Linking from "expo-linking";
import { JOIN_EMANUAL_TITLE } from "@/lib/join-emanual";
import {
  JOIN_EMANUAL_PDF_FILE_NAME,
  JOIN_EMANUAL_PDF_PATH,
  buildJoinEmanualPdfBytes,
} from "@/lib/join-emanual-pdf";
import { buildPlatformPublicUrl } from "@/lib/platform-urls";

export type JoinEmanualDownloadResult = { ok: boolean; detail: string };

function webShareNavigator(): ShareNavigator | null {
  if (typeof navigator === "undefined") return null;
  return navigator as ShareNavigator;
}

type ShareNavigator = Navigator & {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
};

function bytesToBase64(bytes: Uint8Array): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const triple = (a << 16) | (b << 8) | c;
    out += chars[(triple >> 18) & 63];
    out += chars[(triple >> 12) & 63];
    out += i + 1 < bytes.length ? chars[(triple >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? chars[triple & 63] : "=";
  }
  return out;
}

async function savePdfOnNativePhone(): Promise<JoinEmanualDownloadResult> {
  const bytes = buildJoinEmanualPdfBytes();
  const FileSystem = await import("expo-file-system");
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) {
    await Linking.openURL(buildPlatformPublicUrl(JOIN_EMANUAL_PDF_PATH));
    return { ok: true, detail: "The e-manual is opening. Tap Share, then Save to Files." };
  }
  const path = `${dir}${JOIN_EMANUAL_PDF_FILE_NAME}`;
  await FileSystem.writeAsStringAsync(path, bytesToBase64(bytes), { encoding: "base64" });
  try {
    await Share.share({
      title: JOIN_EMANUAL_TITLE,
      url: path,
      message: Platform.OS === "android" ? path : JOIN_EMANUAL_TITLE,
    });
    return { ok: true, detail: "On the next screen, tap Save to Files or Downloads." };
  } catch (err) {
    if (err instanceof Error && /dismiss|cancel/i.test(err.message)) {
      return { ok: true, detail: "Share closed. Tap Download to this phone again if you still need the file." };
    }
    await Linking.openURL(buildPlatformPublicUrl(JOIN_EMANUAL_PDF_PATH));
    return { ok: true, detail: "The e-manual is opening. Tap Share, then Save to Files." };
  }
}

function openHostedPdf(): JoinEmanualDownloadResult {
  if (typeof window !== "undefined") {
    window.location.assign(JOIN_EMANUAL_PDF_PATH);
    return { ok: true, detail: "The PDF is opening. Tap Share, then Save to Files or Downloads." };
  }
  return { ok: false, detail: "Open https://urplatform.llc/e-manual.pdf on this phone." };
}

/** Save the free join e-manual onto this phone or computer. */
export async function downloadJoinEmanual(): Promise<JoinEmanualDownloadResult> {
  if (Platform.OS !== "web") {
    try {
      return await savePdfOnNativePhone();
    } catch {
      return {
        ok: false,
        detail: "Open https://urplatform.llc/e-manual.pdf on this phone, then tap Share → Save to Files.",
      };
    }
  }

  const bytes = buildJoinEmanualPdfBytes();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const nav = webShareNavigator();

  try {
    const file =
      typeof File === "function"
        ? new File([blob], JOIN_EMANUAL_PDF_FILE_NAME, { type: "application/pdf" })
        : null;
    if (file && nav?.canShare?.({ files: [file] }) && nav.share) {
      await nav.share({
        files: [file],
        title: JOIN_EMANUAL_TITLE,
        text: "Your free UR Platform e-manual",
      });
      return { ok: true, detail: "On the next screen, tap Save to Files or Downloads." };
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: true, detail: "Share closed. Tap Download to this phone again if you still need the file." };
    }
  }

  if (typeof document !== "undefined") {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = JOIN_EMANUAL_PDF_FILE_NAME;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return openHostedPdf();
}
