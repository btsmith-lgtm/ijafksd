import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { parseYouTubeId } from "./BackgroundMusic";

const DEFAULT_VIDEO_ID = "Gpd85y_iTxY";

declare global {
  interface Window {
    YT?: {
      Player: new (container: HTMLElement | string, options: object) => YTPlayer;
      PlayerState?: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  getPlayerState: () => number;
  setLoop: (loop: boolean) => void;
  setVolume: (v: number) => void;
  loadVideoById: (id: string) => void;
  destroy: () => void;
}

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return;
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
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

export function BackgroundAudioToggle({
  collapsed,
  musicUrl = "",
  volume = 40,
  enabled = true,
}: {
  collapsed: boolean;
  musicUrl?: string;
  volume?: number;
  enabled?: boolean;
}) {
  const [muted, setMuted] = useState(false);
  const playerRef = useRef<YTPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Music Lobby track replaces the built-in one; empty URL falls back to default.
  const customId = parseYouTubeId(musicUrl);
  const videoId = customId ?? DEFAULT_VIDEO_ID;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Create the player once; later songs swap in with loadVideoById.
  useEffect(() => {
    let cancelled = false;
    let player: YTPlayer | null = null;

    loadYouTubeAPI().then(() => {
      if (cancelled || !containerRef.current || !window.YT) return;

      player = new window.YT.Player(containerRef.current, {
        width: 320,
        height: 180,
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
            playerRef.current = e.target;
            e.target.setLoop(true);
            e.target.setVolume(volumeRef.current);
            if (!mutedRef.current) e.target.unMute();
            e.target.playVideo();
          },
          onStateChange: (e: { data: number; target: YTPlayer }) => {
            if (e.data === window.YT?.PlayerState?.ENDED) {
              e.target.playVideo();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      player?.destroy?.();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Replace the currently playing song when the Music Lobby URL changes.
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    if (!enabledRef.current) return;
    try {
      p.loadVideoById(videoId);
      p.setLoop(true);
      p.setVolume(volumeRef.current);
      if (!mutedRef.current) p.unMute();
      p.playVideo();
    } catch {}
  }, [videoId]);

  // Music Lobby On/Off: actually pause/resume the player.
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (enabled) {
        p.loadVideoById(videoId);
        p.setLoop(true);
        p.setVolume(volumeRef.current);
        if (!mutedRef.current) p.unMute();
        p.playVideo();
      } else {
        p.pauseVideo();
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Volume slider applies live to the playing track.
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      p.setVolume(volume);
    } catch {}
  }, [volume]);

  useEffect(() => {
    if (!playerRef.current) return;
    if (muted) playerRef.current.mute();
    else {
      playerRef.current.unMute();
      playerRef.current.playVideo();
    }
  }, [muted]);

  const toggle = () => {
    const p = playerRef.current;
    // Use the player's real mute state as the source of truth so the button
    // can't get out of sync (e.g. after a browser-forced autoplay mute).
    const next = p ? !safeIsMuted(p) : !muted;
    setMuted(next);
    if (!p) return;
    try {
      if (next) {
        p.mute();
      } else {
        p.unMute();
        p.setVolume(volumeRef.current);
        p.playVideo();
      }
    } catch {}
  };

  function safeIsMuted(p: YTPlayer): boolean {
    try {
      return p.isMuted();
    } catch {
      return mutedRef.current;
    }
  }

  return (
    <>
      <div
        ref={containerRef}
        aria-hidden
        className="pointer-events-none fixed -left-[9999px] top-0 h-[1px] w-[1px] overflow-hidden opacity-0"
      />
      <button
        onClick={toggle}
        aria-label={muted ? "Unmute music" : "Mute music"}
        title={collapsed ? (muted ? "Unmute music" : "Mute music") : undefined}
        className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground ${
          collapsed ? "justify-center" : ""
        }`}
      >
        {muted ? <VolumeX className="h-4 w-4 shrink-0" /> : <Volume2 className="h-4 w-4 shrink-0" />}
        {!collapsed && <span className="truncate">{muted ? "Unmute music" : "Mute music"}</span>}
      </button>
    </>
  );
}
