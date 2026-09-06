/**
 * Device + accessibility bridge for the UR AI hive.
 * User-consent links only — never scan other people's networks or printers.
 */

export type DeviceLinkKind =
  | "document_print"
  | "three_d_printer"
  | "bluetooth"
  | "wifi"
  | "xr_headset"
  | "accessibility";

export type DeviceLinkStatus = "now" | "later";

export type DeviceLink = {
  id: DeviceLinkKind;
  label: string;
  status: DeviceLinkStatus;
  how: string;
};

export const DEVICE_LINKS: readonly DeviceLink[] = [
  {
    id: "document_print",
    label: "Paper printers",
    status: "now",
    how: "Browser or OS print dialog — lessons, worksheets, and takeoffs. User picks the printer.",
  },
  {
    id: "three_d_printer",
    label: "3D printers",
    status: "now",
    how: "OctoPrint (and shop equipment connections) for machines the user already owns and authorizes.",
  },
  {
    id: "xr_headset",
    label: "3D / VR helmets",
    status: "now",
    how: "WebXR in a headset browser (Quest, Vision-class, PC VR). Opens UR World or UR 3D Workspace — not a game cheat overlay.",
  },
  {
    id: "accessibility",
    label: "Access for everyone",
    status: "now",
    how: "Screen-reader labels, captions on talk, large type, and Reading AI phonics — not a medical diagnosis.",
  },
  {
    id: "bluetooth",
    label: "Bluetooth accessories",
    status: "later",
    how: "Pair only devices the user chooses (headphones, a shop printer). Never scan strangers' phones.",
  },
  {
    id: "wifi",
    label: "Wi-Fi printers and shops",
    status: "later",
    how: "Connect to a printer or OctoPrint host the user types in. Not a Wi-Fi attack tool.",
  },
];

export function deviceLinksNow(): DeviceLink[] {
  return DEVICE_LINKS.filter((d) => d.status === "now");
}

export function deviceLinksLater(): DeviceLink[] {
  return DEVICE_LINKS.filter((d) => d.status === "later");
}

export function canUseDocumentPrint(): boolean {
  return typeof window !== "undefined" && typeof window.print === "function";
}

export function printCurrentDocument(): { ok: boolean; detail: string } {
  if (!canUseDocumentPrint()) {
    return { ok: false, detail: "Open this page in a browser, then use the printer your device already knows." };
  }
  window.print();
  return { ok: true, detail: "Print dialog opened — pick your printer." };
}

/** Open sanitized HTML in a print dialog so the user can Save as PDF. */
export function printHtmlDocument(html: string): { ok: boolean; detail: string } {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { ok: false, detail: "Open this page in a browser to print or save as PDF." };
  }
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return { ok: false, detail: "Could not open a print frame." };
  }
  doc.open();
  doc.write(html);
  doc.close();
  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  setTimeout(() => frame.remove(), 2000);
  return { ok: true, detail: "Print dialog opened — pick your printer or Save as PDF." };
}

export type XrSupport = {
  immersiveVr: boolean;
  immersiveAr: boolean;
  detail: string;
};

export async function detectXrHeadset(): Promise<XrSupport> {
  const xr =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { xr?: { isSessionSupported: (mode: string) => Promise<boolean> } }).xr
      : undefined;
  if (!xr?.isSessionSupported) {
    return {
      immersiveVr: false,
      immersiveAr: false,
      detail: "Open this site in a headset browser (Meta Quest Browser, visionOS Safari, or a PC VR browser).",
    };
  }
  try {
    const immersiveVr = await xr.isSessionSupported("immersive-vr");
    const immersiveAr = await xr.isSessionSupported("immersive-ar").catch(() => false);
    if (!immersiveVr && !immersiveAr) {
      return {
        immersiveVr: false,
        immersiveAr: false,
        detail: "This browser has WebXR but no immersive session. Try the headset's own browser.",
      };
    }
    return {
      immersiveVr,
      immersiveAr,
      detail: immersiveVr
        ? "This headset browser can enter VR. Open UR World or UR 3D Workspace, then stay in this tab."
        : "AR is available. VR enter is not on this device.",
    };
  } catch {
    return {
      immersiveVr: false,
      immersiveAr: false,
      detail: "WebXR probe failed. Use the headset browser, not a desktop tab.",
    };
  }
}

export const XR_WORLD_PATH = "/world";
export const XR_WORKSPACE_PATH = "/3d-workspace";
export const XR_GAME_FORGE_PATH = "/ais?group=tech&ai=ai-game-dev-001";
