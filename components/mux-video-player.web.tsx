import { useEffect, useRef } from "react";
import { muxHlsUrl } from "@/lib/mux-video-engine";
import { useFairShowWatch } from "@/hooks/use-fair-show-watch";
import { FAIR_SHOW_RULES, type FairShowContentKind } from "@/lib/fair-show";

type Props = {
  playbackId: string;
  token?: string;
  watch?: { contentId: string; kind: FairShowContentKind; durationSeconds: number };
};

type HlsLike = {
  destroy: () => void;
  loadSource: (src: string) => void;
  attachMedia: (video: HTMLVideoElement) => void;
};

type HlsCtor = {
  isSupported: () => boolean;
  new (): HlsLike;
};

function loadHlsConstructor(): Promise<HlsCtor | null> {
  const existing = (window as Window & { Hls?: HlsCtor }).Hls;
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js";
    script.async = true;
    script.onload = () => resolve((window as Window & { Hls?: HlsCtor }).Hls ?? null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

export function MuxVideoPlayer({ playbackId, token, watch }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const src = muxHlsUrl(playbackId, token);
  const { pulse } = useFairShowWatch(watch ?? null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let hls: HlsLike | null = null;
    let cancelled = false;

    const attach = async () => {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        return;
      }
      const Hls = await loadHlsConstructor();
      if (cancelled || !Hls?.isSupported()) {
        video.src = src;
        return;
      }
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
    };

    void attach();
    const onTime = () => {
      if (!watch || !video) return;
      pulse(Math.round(video.currentTime), video.ended || video.currentTime >= video.duration - 1);
    };
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("ended", onTime);
    return () => {
      cancelled = true;
      hls?.destroy();
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("ended", onTime);
    };
  }, [src, watch, pulse]);

  return (
    <video
      ref={ref}
      controls
      playsInline
      style={{
        width: "100%",
        aspectRatio: "16 / 9",
        backgroundColor: "#000",
        borderRadius: 12,
      }}
    />
  );
}
