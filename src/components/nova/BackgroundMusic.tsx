import { useEffect, useRef } from "react";

export function parseYouTubeId(input: string): string | null {
  const raw = (input || "").trim();
  if (!raw) return null;
  if (/^[\w-]{11}$/.test(raw)) return raw;
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1, 12) || null;
    const v = u.searchParams.get("v");
    if (v) return v.slice(0, 11);
    const m = u.pathname.match(/\/(embed|shorts|live)\/([\w-]{11})/);
    if (m) return m[2];
  } catch {
    /* not a url */
  }
  return null;
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  setVolume: (v: number) => void;
  setLoop: (loop: boolean) => void;
  loadVideoById: (id: string) => void;
  destroy: () => void;
}

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return;
    const w = window as unknown as { YT?: { Player?: unknown }; onYouTubeIframeAPIReady?: () => void };
    if (w.YT && w.YT.Player) {
      resolve();
      return;
    }
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
}

/** Hidden looping YouTube player used as the app's background music. */
export function BackgroundMusic({
  url,
  enabled,
  volume,
}: {
  url: string;
  enabled: boolean;
  volume: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const videoId = parseYouTubeId(url);

  // Keep one persistent player for the lifetime of the app. Only destroyed on unmount.
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  useEffect(() => {
    if (!enabled || !videoId) {
      try { playerRef.current?.pauseVideo?.(); } catch {}
      return;
    }
    let cancelled = false;

    // Browsers block unmuted autoplay until the user interacts once.
    const unlock = () => {
      const p = playerRef.current;
      if (!p) return;
      try {
        p.unMute();
        p.setVolume(volumeRef.current);
        p.playVideo();
      } catch {}
    };

    loadYouTubeAPI().then(() => {
      if (cancelled || !containerRef.current) return;
      // Replace whatever is already playing with the new video.
      if (playerRef.current) {
        try {
          playerRef.current.loadVideoById(videoId);
          playerRef.current.setLoop(true);
          playerRef.current.unMute();
          playerRef.current.setVolume(volumeRef.current);
          playerRef.current.playVideo();
        } catch {}
        return;
      }
      const YT = (window as unknown as { YT: { Player: new (el: HTMLElement, o: object) => YTPlayer } }).YT;
      playerRef.current = new YT.Player(containerRef.current, {
        width: 200,
        height: 120,
        videoId,
        playerVars: {
          autoplay: 1,
          loop: 1,
          playlist: videoId,
          controls: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          enablejsapi: 1,
        },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            e.target.setLoop(true);
            e.target.setVolume(volumeRef.current);
            // Start muted so autoplay is always allowed, then unmute on first gesture.
            e.target.mute();
            e.target.playVideo();
            e.target.unMute();
            e.target.playVideo();
          },
          onStateChange: (e: { data: number; target: YTPlayer }) => {
            if (e.data === 0) e.target.playVideo();
          },
        },
      });
    });

    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      // Keep the player alive across URL changes so the next song replaces
      // the current one in-place instead of stacking a second player.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, enabled]);

  // Destroy only when the component truly unmounts.
  useEffect(() => {
    return () => {
      try { playerRef.current?.destroy?.(); } catch {}
      playerRef.current = null;
    };
  }, []);

  // Volume slider: unmute + apply live so changes are heard immediately.
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      p.unMute();
      p.setVolume(volume);
    } catch {}
  }, [volume]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0"
    >
      <div ref={containerRef} />
    </div>
  );
}
