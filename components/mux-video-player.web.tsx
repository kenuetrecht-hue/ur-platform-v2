import { useEffect, useRef } from "react";
import { muxHlsUrl } from "@/lib/mux-video-engine";

type Props = {
  playbackId: string;
  token?: string;
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

export function MuxVideoPlayer({ playbackId, token }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const src = muxHlsUrl(playbackId, token);

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
    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src]);

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
