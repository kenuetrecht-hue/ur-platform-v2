/**
 * Music Studio hookups — same rule as printers and CAD:
 * we hand you a file or an OS dialog. You start the printer, DAW, deck, or MIDI box.
 * Never scan other people's Bluetooth, Wi-Fi, or USB.
 */

import { printHtmlDocument } from "./ai-device-bridge";
import {
  MUSIC_STEPS,
  MUSIC_TRACKS,
  suggestChordProgressions,
  type MusicKeyId,
  type MusicPattern,
  type MusicTrackId,
} from "./music-studio";

export const MUSIC_USER_STARTS_REMINDER =
  "File saved to your Downloads. You open it on your DAW, USB deck, or printer. This studio will not start someone else's machine.";

export type MusicHookupId =
  | "speakers"
  | "print_chart"
  | "midi_file"
  | "midi_port"
  | "headphones_os"
  | "audio_in"
  | "usb_deck";

export type MusicHookup = {
  id: MusicHookupId;
  label: string;
  status: "now" | "later";
  how: string;
};

export const BLUETOOTH_PAIR_HELP =
  "Open your phone or computer Bluetooth settings and pair your headphones there. UR never scans for nearby phones.";

export const MUSIC_HOOKUPS: readonly MusicHookup[] = [
  {
    id: "speakers",
    label: "Speakers / headphones",
    status: "now",
    how: "Plays through whatever output your device already chose.",
  },
  {
    id: "print_chart",
    label: "Paper / PDF chart",
    status: "now",
    how: "Print lyrics and chords — you pick the printer, same as worksheets.",
  },
  {
    id: "midi_file",
    label: "MIDI for your DAW",
    status: "now",
    how: "Download a .mid. You drag it into Ableton, Logic, FL, or a USB stick for a deck.",
  },
  {
    id: "midi_port",
    label: "Your MIDI keyboard",
    status: "now",
    how: "Connect only after you tap Allow. Sends a test chord to the port you pick.",
  },
  {
    id: "headphones_os",
    label: "Bluetooth headphones",
    status: "now",
    how: BLUETOOTH_PAIR_HELP,
  },
  {
    id: "audio_in",
    label: "Audio interface / mic",
    status: "now",
    how: "Browser picker after you tap Allow. You choose your interface. We stop the stream after listing — nothing is uploaded.",
  },
  {
    id: "usb_deck",
    label: "USB deck stick",
    status: "now",
    how: "Download MIDI + a deck card. Copy them to your USB stick. You load the file on the deck.",
  },
] as const;

const DRUM_NOTE: Record<MusicTrackId, number> = {
  kick: 36,
  snare: 38,
  hat: 42,
  bass: 35,
  clap: 39,
  perc: 37,
  pad: 48,
  lead: 60,
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildMusicLeadSheetHtml(input: {
  title: string;
  bpm: number;
  key: MusicKeyId;
  kit: string;
  lyrics: string;
}): string {
  const chords = suggestChordProgressions(input.key).map(escapeHtml).join("<br/>");
  const lyrics = escapeHtml(input.lyrics || "(no lyrics yet)").replace(/\n/g, "<br/>");
  return `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(input.title)}</title>
  <style>body{font-family:Georgia,serif;padding:24px;color:#111}h1{font-size:22px}h2{font-size:14px;margin-top:20px}.meta{color:#444;font-size:13px}</style>
  </head><body>
  <h1>${escapeHtml(input.title)}</h1>
  <p class="meta">${input.bpm} BPM · key ${escapeHtml(input.key)} · kit ${escapeHtml(input.kit)}</p>
  <p class="meta">${MUSIC_USER_STARTS_REMINDER}</p>
  <h2>Chords</h2><p>${chords}</p>
  <h2>Lyrics</h2><p>${lyrics}</p>
  </body></html>`;
}

export function printMusicLeadSheet(input: {
  title: string;
  bpm: number;
  key: MusicKeyId;
  kit: string;
  lyrics: string;
}): { ok: boolean; detail: string } {
  return printHtmlDocument(buildMusicLeadSheetHtml(input));
}

function writeVarLen(value: number): number[] {
  const bytes: number[] = [];
  let buffer = value & 0x7f;
  let rest = value >> 7;
  while (rest > 0) {
    bytes.unshift((rest & 0x7f) | 0x80);
    rest >>= 7;
  }
  bytes.push(buffer);
  if (bytes.length === 0) bytes.push(0);
  return bytes;
}

/** Standard MIDI file of the drum grid — user opens it. */
export function buildMusicMidiFile(pattern: MusicPattern, bpm: number): Uint8Array {
  const ticks = 480;
  const tempo = Math.round(60_000_000 / Math.max(40, bpm));
  const timed: { tick: number; bytes: number[] }[] = [
    { tick: 0, bytes: [0xff, 0x51, 0x03, (tempo >> 16) & 0xff, (tempo >> 8) & 0xff, tempo & 0xff] },
  ];
  for (let step = 0; step < MUSIC_STEPS; step += 1) {
    const tick = step * (ticks / 4);
    for (const track of MUSIC_TRACKS) {
      if (!pattern[track]?.[step]) continue;
      const note = DRUM_NOTE[track];
      timed.push({ tick, bytes: [0x99, note, 100] });
      timed.push({ tick: tick + ticks / 8, bytes: [0x89, note, 0] });
    }
  }
  timed.push({ tick: MUSIC_STEPS * (ticks / 4), bytes: [0xff, 0x2f, 0x00] });
  timed.sort((a, b) => a.tick - b.tick);

  const events: number[] = [];
  let lastTick = 0;
  for (const event of timed) {
    events.push(...writeVarLen(Math.max(0, Math.round(event.tick - lastTick))), ...event.bytes);
    lastTick = event.tick;
  }

  const trackLen = events.length;
  const bytes = [
    0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01,
    (ticks >> 8) & 0xff, ticks & 0xff,
    0x4d, 0x54, 0x72, 0x6b,
    (trackLen >> 24) & 0xff, (trackLen >> 16) & 0xff, (trackLen >> 8) & 0xff, trackLen & 0xff,
    ...events,
  ];
  return Uint8Array.from(bytes);
}

export function downloadMusicMidi(pattern: MusicPattern, bpm: number, title: string): { ok: boolean; detail: string } {
  if (typeof document === "undefined") {
    return { ok: false, detail: "Open Music Studio on the website to download MIDI." };
  }
  const bytes = buildMusicMidiFile(pattern, bpm);
  const blob = new Blob([bytes], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^\w\-]+/g, "_").slice(0, 40) || "ur-beat"}.mid`;
  a.click();
  URL.revokeObjectURL(url);
  return { ok: true, detail: MUSIC_USER_STARTS_REMINDER };
}

export type MidiPortInfo = { id: string; name: string };

type MidiOut = { id: string; name?: string; send: (data: number[]) => void };
type MidiAccess = { outputs: Map<string, MidiOut> };

let userMidiAccess: MidiAccess | null = null;

export function musicHookupsNow(): MusicHookup[] {
  return MUSIC_HOOKUPS.filter((h) => h.status === "now");
}

export function musicHookupsLater(): MusicHookup[] {
  return MUSIC_HOOKUPS.filter((h) => h.status === "later");
}

export async function listUserMidiOutputs(): Promise<{ ok: boolean; ports: MidiPortInfo[]; detail: string }> {
  const midiNav =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { requestMIDIAccess?: () => Promise<MidiAccess> })
      : undefined;
  if (!midiNav?.requestMIDIAccess) {
    return { ok: false, ports: [], detail: "This browser has no Web MIDI. Use Chrome/Edge on the website, then tap Connect." };
  }
  try {
    userMidiAccess = await midiNav.requestMIDIAccess();
    const ports = [...userMidiAccess.outputs.values()].map((port) => ({
      id: port.id,
      name: port.name || "MIDI out",
    }));
    return {
      ok: true,
      ports,
      detail: ports.length
        ? "Pick your keyboard or deck. We only see ports you allowed."
        : "No MIDI outputs yet. Plug in your keyboard, then tap Connect again.",
    };
  } catch {
    userMidiAccess = null;
    return { ok: false, ports: [], detail: "MIDI permission was denied. That is fine — use MIDI download instead." };
  }
}

export function bluetoothPairHelp(): { ok: true; detail: string } {
  return { ok: true, detail: BLUETOOTH_PAIR_HELP };
}

export type AudioInputInfo = { id: string; label: string };

/** User-consent mic/interface list. Stops tracks immediately. Never uploads audio. */
export async function listUserAudioInputs(): Promise<{
  ok: boolean;
  devices: AudioInputInfo[];
  detail: string;
}> {
  const media =
    typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
  if (!media?.getUserMedia) {
    return {
      ok: false,
      devices: [],
      detail: "Open Music Studio on the website to pick an audio interface.",
    };
  }
  let stream: MediaStream | null = null;
  try {
    stream = await media.getUserMedia({ audio: true, video: false });
    const listed = await media.enumerateDevices();
    const devices = listed
      .filter((device) => device.kind === "audioinput")
      .map((device) => ({
        id: device.deviceId || "default",
        label: device.label || "Audio input",
      }));
    return {
      ok: true,
      devices,
      detail: devices.length
        ? "Inputs you allowed. Pick your interface in the browser dialog. Nothing was uploaded."
        : "No audio inputs listed. Plug in your interface, then tap again.",
    };
  } catch {
    return {
      ok: false,
      devices: [],
      detail: "Mic/interface permission was denied. That is fine — use speakers only.",
    };
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
  }
}

export function downloadUsbDeckPack(
  pattern: MusicPattern,
  bpm: number,
  title: string,
  extra?: { key?: string; kit?: string },
): { ok: boolean; detail: string } {
  const midi = downloadMusicMidi(pattern, bpm, title);
  if (typeof document === "undefined") return midi;
  const safe = title.replace(/[^\w\-]+/g, "_").slice(0, 40) || "ur-beat";
  const card = [
    "UR Music Studio — USB deck card",
    title.slice(0, 80),
    `${bpm} BPM${extra?.key ? ` · key ${extra.key}` : ""}${extra?.kit ? ` · kit ${extra.kit}` : ""}`,
    MUSIC_USER_STARTS_REMINDER,
    "Copy the .mid onto your USB stick. Load it on your deck. You press Start.",
  ].join("\n");
  const blob = new Blob([card], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safe}-deck-card.txt`;
  a.click();
  URL.revokeObjectURL(url);
  return {
    ok: midi.ok,
    detail: midi.ok
      ? "MIDI + deck card saved. Copy them to your USB stick. You load the deck."
      : midi.detail,
  };
}

/** Sends a short test note to a port the user already allowed. */
export async function pingUserMidiOutput(portId?: string): Promise<{ ok: boolean; detail: string }> {
  if (!userMidiAccess) {
    const listed = await listUserMidiOutputs();
    if (!listed.ok) return { ok: false, detail: listed.detail };
  }
  const access = userMidiAccess;
  if (!access || access.outputs.size === 0) {
    return { ok: false, detail: "No MIDI outputs yet. Plug in your keyboard, then tap Connect again." };
  }
  const port = (portId && access.outputs.get(portId)) || [...access.outputs.values()][0];
  if (!port) return { ok: false, detail: "That MIDI port is gone. Tap Connect again." };
  try {
    port.send([0x90, 60, 100]);
    setTimeout(() => {
      try {
        port.send([0x80, 60, 0]);
      } catch {
        /* user unplugged */
      }
    }, 400);
    return { ok: true, detail: `Test note sent to ${port.name || "your MIDI out"}. You start the rest on that box.` };
  } catch {
    return { ok: false, detail: "Could not send to that MIDI port. Try download MIDI instead." };
  }
}
