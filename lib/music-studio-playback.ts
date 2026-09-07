/**
 * Beat playback — Web Audio drum / pad hits on web / PWA.
 * Pro mixer, FX, WAV export, and chord stabs live here. Not Avid Pro Tools.
 */

import { Platform } from "react-native";
import {
  clampCueStep,
  crossfadeGains,
  emptyMusicFx,
  emptyMusicMixer,
  isMetronomeAccent,
  isMetronomeClick,
  MUSIC_STEPS,
  MUSIC_TRACKS,
  type MusicFx,
  type MusicKitId,
  type MusicMixer,
  type MusicPattern,
  type MusicTrackId,
} from "./music-studio";

export type MusicPlayOpts = {
  pattern: MusicPattern;
  patternB?: MusicPattern;
  bpm: number;
  kit: MusicKitId;
  mixer?: MusicMixer;
  fx?: MusicFx;
  steps?: number;
  crossfade?: number;
  metronome?: boolean;
  startStep?: number;
  onStep?: (step: number) => void;
};

let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let cueTimer: ReturnType<typeof setInterval> | null = null;
let stepIndex = 0;
let liveOpts: MusicPlayOpts | null = null;

const KIT_TONE: Record<MusicKitId, Record<MusicTrackId, number>> = {
  hiphop: { kick: 58, snare: 180, hat: 7200, bass: 49, clap: 420, perc: 240, pad: 196, lead: 392 },
  house: { kick: 52, snare: 200, hat: 9000, bass: 55, clap: 480, perc: 260, pad: 220, lead: 440 },
  rock: { kick: 70, snare: 220, hat: 6400, bass: 82, clap: 360, perc: 200, pad: 165, lead: 330 },
  latin: { kick: 90, snare: 340, hat: 4800, bass: 98, clap: 520, perc: 310, pad: 247, lead: 494 },
};

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

function channelAudible(track: MusicTrackId, mixer: MusicMixer): boolean {
  const ch = mixer[track];
  if (!ch || ch.mute) return false;
  const anySolo = MUSIC_TRACKS.some((id) => mixer[id]?.solo);
  if (anySolo && !ch.solo) return false;
  return true;
}

function hit(
  ac: AudioContext,
  track: MusicTrackId,
  kit: MusicKitId,
  mixer: MusicMixer,
  fx: MusicFx,
  deckGain = 1,
): void {
  if (deckGain <= 0.02) return;
  if (!channelAudible(track, mixer)) return;
  const ch = mixer[track];
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 400 + fx.filter * 80;
  osc.connect(filter);
  filter.connect(gain);
  const panValue = (ch.pan ?? 0) / 100;
  if (ac.createStereoPanner) {
    const panner = ac.createStereoPanner();
    panner.pan.value = panValue;
    gain.connect(panner);
    panner.connect(ac.destination);
  } else {
    gain.connect(ac.destination);
  }
  osc.frequency.value = KIT_TONE[kit][track];
  osc.type =
    track === "hat" || track === "perc"
      ? "square"
      : track === "snare" || track === "clap"
        ? "triangle"
        : track === "pad" || track === "lead"
          ? "sawtooth"
          : "sine";
  const decay =
    track === "hat" ? 0.08 : track === "snare" || track === "clap" ? 0.14 : track === "pad" ? 0.45 : 0.22;
  const vol = ((ch.volume ?? 80) / 100) * (track === "hat" ? 0.08 : 0.2) * (1 + fx.reverb / 400) * deckGain;
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + decay + fx.delay / 400);
  osc.start(now);
  osc.stop(now + decay + fx.delay / 500);
}

function clickMetronome(ac: AudioContext, accent: boolean): void {
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "square";
  osc.frequency.value = accent ? 1400 : 880;
  osc.connect(gain);
  gain.connect(ac.destination);
  gain.gain.setValueAtTime(accent ? 0.09 : 0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc.start(now);
  osc.stop(now + 0.05);
}

function playStepHits(ac: AudioContext, opts: MusicPlayOpts, step: number, deckGainA: number, deckGainB: number): void {
  const mixer = opts.mixer ?? emptyMusicMixer();
  const fx = opts.fx ?? emptyMusicFx();
  for (const track of MUSIC_TRACKS) {
    if (opts.pattern[track]?.[step]) hit(ac, track, opts.kit, mixer, fx, deckGainA);
    if (opts.patternB?.[track]?.[step]) hit(ac, track, opts.kit, mixer, fx, deckGainB);
  }
  if (opts.metronome && isMetronomeClick(step)) {
    clickMetronome(ac, isMetronomeAccent(step));
  }
}

export function canPlayMusicStudio(): boolean {
  return Platform.OS === "web" && typeof window !== "undefined";
}

export function stopMusicStudioCue(): void {
  if (cueTimer) {
    clearInterval(cueTimer);
    cueTimer = null;
  }
}

export function stopMusicStudioPlayback(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  stopMusicStudioCue();
  liveOpts = null;
  stepIndex = 0;
}

export function isMusicStudioPlaying(): boolean {
  return timer !== null;
}

export function updateMusicStudioLive(partial: Partial<MusicPlayOpts>): void {
  if (liveOpts) Object.assign(liveOpts, partial);
}

export function playMusicStudioPattern(opts: MusicPlayOpts): boolean {
  if (!canPlayMusicStudio()) return false;
  const ac = audioContext();
  if (!ac) return false;
  stopMusicStudioPlayback();
  void ac.resume();
  liveOpts = { ...opts };
  const steps = Math.min(MUSIC_STEPS, Math.max(8, opts.steps ?? MUSIC_STEPS));
  stepIndex = clampCueStep(opts.startStep ?? 0);
  const stepMs = 60_000 / opts.bpm / 4;
  const tick = () => {
    const live = liveOpts;
    if (!live) return;
    live.onStep?.(stepIndex);
    const gains = crossfadeGains(live.crossfade ?? 0);
    playStepHits(ac, live, stepIndex, gains.a, gains.b);
    stepIndex = (stepIndex + 1) % steps;
  };
  tick();
  timer = setInterval(tick, stepMs);
  return true;
}

/** Preview four steps from the cue point at full deck gain, or jump if already playing. */
export function cueMusicStudio(opts: MusicPlayOpts & { cueStep?: number; deck?: "a" | "b" }): boolean {
  if (!canPlayMusicStudio()) return false;
  const ac = audioContext();
  if (!ac) return false;
  void ac.resume();
  const cueStep = clampCueStep(opts.cueStep ?? 0);
  if (timer && liveOpts) {
    stepIndex = cueStep;
    liveOpts.onStep?.(stepIndex);
    return true;
  }
  stopMusicStudioCue();
  const steps = Math.min(MUSIC_STEPS, Math.max(8, opts.steps ?? MUSIC_STEPS));
  let remaining = 4;
  let local = cueStep;
  const stepMs = 60_000 / opts.bpm / 4;
  const gainA = opts.deck === "b" ? 0 : 1;
  const gainB = opts.deck === "b" ? 1 : 0;
  const tick = () => {
    opts.onStep?.(local);
    playStepHits(ac, opts, local, gainA, gainB);
    local = (local + 1) % steps;
    remaining -= 1;
    if (remaining <= 0) stopMusicStudioCue();
  };
  tick();
  if (remaining > 0) cueTimer = setInterval(tick, stepMs);
  return true;
}

const CHORD_FREQ: Record<string, number[]> = {
  C: [261.63, 329.63, 392.0],
  D: [293.66, 369.99, 440.0],
  E: [329.63, 415.3, 493.88],
  F: [349.23, 440.0, 523.25],
  G: [392.0, 493.88, 587.33],
  A: [440.0, 554.37, 659.25],
  Bb: [233.08, 293.66, 349.23],
};

/** Vinyl scratch — short noise burst the turntable fires on drag. */
export function scratchMusicStudio(intensity = 1): boolean {
  if (!canPlayMusicStudio()) return false;
  const ac = audioContext();
  if (!ac) return false;
  void ac.resume();
  const now = ac.currentTime;
  const length = Math.floor(ac.sampleRate * 0.16);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  const level = Math.min(1.4, Math.max(0.25, Math.abs(intensity)));
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.35)) * 0.45 * level;
  }
  const src = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const gain = ac.createGain();
  src.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.value = 700 + level * 500;
  filter.Q.value = 0.7;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  gain.gain.setValueAtTime(0.22, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
  src.start(now);
  return true;
}

export function playMusicChord(key: string): boolean {
  const ac = audioContext();
  if (!ac) return false;
  void ac.resume();
  const freqs = CHORD_FREQ[key] ?? CHORD_FREQ.C;
  const now = ac.currentTime;
  for (const freq of freqs) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ac.destination);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc.start(now);
    osc.stop(now + 0.7);
  }
  return true;
}

function writeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** Offline 2-bar bounce of the current grid — Pro export. */
export function exportMusicStudioWav(opts: {
  pattern: MusicPattern;
  bpm: number;
  kit: MusicKitId;
  mixer?: MusicMixer;
  steps?: number;
  title?: string;
}): boolean {
  if (!canPlayMusicStudio()) return false;
  const mixer = opts.mixer ?? emptyMusicMixer();
  const steps = Math.min(MUSIC_STEPS, Math.max(8, opts.steps ?? 16));
  const sampleRate = 22050;
  const stepSec = 60 / opts.bpm / 4;
  const samples = new Float32Array(Math.floor(sampleRate * stepSec * steps));
  for (let step = 0; step < steps; step += 1) {
    const start = Math.floor(step * stepSec * sampleRate);
    for (const track of MUSIC_TRACKS) {
      if (!opts.pattern[track]?.[step] || !channelAudible(track, mixer)) continue;
      const freq = KIT_TONE[opts.kit][track];
      const vol = (mixer[track]?.volume ?? 80) / 100 * 0.18;
      for (let i = 0; i < Math.floor(sampleRate * 0.12); i += 1) {
        const idx = start + i;
        if (idx >= samples.length) break;
        samples[idx] += Math.sin((2 * Math.PI * freq * i) / sampleRate) * vol * Math.exp(-i / 600);
      }
    }
  }
  const blob = writeWav(samples, sampleRate);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(opts.title || "ur-beat").replace(/[^\w\-]+/g, "_").slice(0, 40)}.wav`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
