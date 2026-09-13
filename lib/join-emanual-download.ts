import { Platform } from "react-native";
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

/** Save the free join e-manual onto this phone or computer. */
export async function downloadJoinEmanual(): Promise<JoinEmanualDownloadResult> {
  if (Platform.OS !== "web") {
    const url = buildPlatformPublicUrl(JOIN_EMANUAL_PDF_PATH);
    try {
      await Linking.openURL(url);
      return { ok: true, detail: "The e-manual is opening. Save it to Files or Downloads." };
    } catch {
      return {
        ok: false,
        detail: "Open https://urplatform.llc/e-manual on this phone, then tap Download to this phone.",
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

  if (typeof document === "undefined") {
    return { ok: false, detail: "Open this page in the website browser, then tap Download to this phone." };
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = JOIN_EMANUAL_PDF_FILE_NAME;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { ok: true, detail: "The e-manual is saving. Check Downloads or Files on this phone." };
}
