import { useEffect, useRef } from "react";

export type LiveWallpaperId =
  | ""
  | "matrix"
  | "starfield"
  | "warp"
  | "rain"
  | "snow"
  | "fireflies"
  | "constellation"
  | "meteors"
  | "embers"
  | "bubbles"
  | "plasma";

export const liveWallpapers: { id: LiveWallpaperId; label: string }[] = [
  { id: "", label: "Off" },
  { id: "matrix", label: "Matrix rain" },
  { id: "starfield", label: "Starfield" },
  { id: "warp", label: "Warp speed" },
  { id: "rain", label: "Digital rain" },
  { id: "snow", label: "Snowfall" },
  { id: "fireflies", label: "Fireflies" },
  { id: "constellation", label: "Constellation" },
  { id: "meteors", label: "Meteor shower" },
  { id: "embers", label: "Embers" },
  { id: "bubbles", label: "Bubbles" },
  { id: "plasma", label: "Plasma drift" },
];

/** Legacy ids from older versions map onto the new particle presets. */
const ALIASES: Record<string, LiveWallpaperId> = {
  aurora: "plasma",
  nebula: "constellation",
  waves: "plasma",
  lava: "embers",
  sunset: "meteors",
};

const BACKDROP: Record<string, string> = {
  matrix: "#000000",
  starfield: "radial-gradient(ellipse at 50% 40%, #131a3a, #05060f 70%)",
  warp: "#03040c",
  rain: "linear-gradient(180deg,#050b16,#01040a)",
  snow: "linear-gradient(180deg,#0b1220,#050810)",
  fireflies: "linear-gradient(180deg,#07130d,#02060a)",
  constellation: "radial-gradient(ellipse at 50% 30%, #16143a, #05060f 70%)",
  meteors: "linear-gradient(180deg,#0b0620,#04030c)",
  embers: "linear-gradient(180deg,#1a0705,#07030a)",
  bubbles: "linear-gradient(180deg,#04121c,#01060c)",
  plasma: "#04030c",
};

type P = Record<string, number>;

function draw(id: LiveWallpaperId, ctx: CanvasRenderingContext2D, w: number, h: number, ps: P[], t: number) {
  ctx.clearRect(0, 0, w, h);

  if (id === "matrix" || id === "rain") {
    const green = id === "matrix";
    const chars = green ? "01アイウエオカキクケコサシスセソﾊﾋﾌﾍﾎ" : "01";
    ctx.font = "14px monospace";
    for (const p of ps) {
      p.y += p.vy;
      if (p.y > h + p.len * 16) {
        p.y = -Math.random() * h * 0.5;
        p.vy = 2 + Math.random() * 5;
      }
      for (let i = 0; i < p.len; i++) {
        const y = p.y - i * 16;
        if (y < -16 || y > h + 16) continue;
        const a = Math.max(0, 1 - i / p.len);
        ctx.fillStyle = green
          ? i === 0
            ? "rgba(220,255,220,0.95)"
            : `rgba(34,197,94,${a * 0.85})`
          : i === 0
            ? "rgba(220,240,255,0.95)"
            : `rgba(56,189,248,${a * 0.8})`;
        const c = chars[Math.floor((p.seed + i * 7 + t * 0.004 * p.len) % chars.length)];
        ctx.fillText(c, p.x, y);
      }
    }
    return;
  }

  if (id === "starfield" || id === "warp") {
    const cx = w / 2;
    const cy = h / 2;
    for (const p of ps) {
      p.z -= p.vz;
      if (p.z <= 1) {
        p.x = (Math.random() - 0.5) * w * 2;
        p.y = (Math.random() - 0.5) * h * 2;
        p.z = w;
      }
      const k = 128 / p.z;
      const x = cx + p.x * k;
      const y = cy + p.y * k;
      if (x < 0 || x > w || y < 0 || y > h) continue;
      const size = Math.max(0.4, (1 - p.z / w) * 2.6);
      if (id === "warp") {
        const k2 = 128 / Math.min(w, p.z + p.vz * 6);
        ctx.strokeStyle = `rgba(200,220,255,${1 - p.z / w})`;
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(cx + p.x * k2, cy + p.y * k2);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(255,255,255,${0.25 + (1 - p.z / w) * 0.75})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }

  if (id === "constellation") {
    for (const p of ps) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    }
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const dx = ps[i].x - ps[j].x;
        const dy = ps[i].y - ps[j].y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 16000) {
          ctx.strokeStyle = `rgba(140,170,255,${(1 - d2 / 16000) * 0.35})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(ps[i].x, ps[i].y);
          ctx.lineTo(ps[j].x, ps[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.fillStyle = "rgba(200,220,255,0.9)";
    for (const p of ps) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (id === "meteors") {
    for (const p of ps) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y > h + 60 || p.x > w + 60) {
        p.x = Math.random() * w - w * 0.4;
        p.y = -Math.random() * h * 0.4;
      }
      const g = ctx.createLinearGradient(p.x, p.y, p.x - p.vx * p.len, p.y - p.vy * p.len);
      g.addColorStop(0, `rgba(255,235,205,${p.a})`);
      g.addColorStop(1, "rgba(255,120,180,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = p.s;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * p.len, p.y - p.vy * p.len);
      ctx.stroke();
    }
    return;
  }

  if (id === "snow" || id === "embers" || id === "bubbles" || id === "fireflies") {
    for (const p of ps) {
      p.t += 0.02;
      p.x += p.vx + Math.sin(p.t) * p.sway;
      p.y += p.vy;
      if (p.y > h + 20) {
        p.y = -20;
        p.x = Math.random() * w;
      }
      if (p.y < -20) {
        p.y = h + 20;
        p.x = Math.random() * w;
      }
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;

      const flick = id === "fireflies" ? 0.35 + 0.65 * Math.abs(Math.sin(p.t * 1.7 + p.seed)) : 1;
      const color =
        id === "snow"
          ? `rgba(255,255,255,${p.a * flick})`
          : id === "embers"
            ? `rgba(255,${120 + Math.floor(p.seed % 90)},60,${p.a * flick})`
            : id === "bubbles"
              ? `rgba(150,220,255,${p.a * 0.7})`
              : `rgba(190,255,120,${p.a * flick})`;
      ctx.fillStyle = color;
      ctx.shadowBlur = id === "snow" ? 0 : 12;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
      if (id === "bubbles") {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
    return;
  }

  // plasma — drifting glowing orbs
  for (const p of ps) {
    p.t += 0.005;
    const x = w / 2 + Math.cos(p.t * p.vx + p.seed) * w * 0.42;
    const y = h / 2 + Math.sin(p.t * p.vy + p.seed) * h * 0.45;
    const r = p.s * Math.min(w, h);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `hsla(${(p.seed * 40 + p.t * 30) % 360},85%,62%,0.5)`);
    g.addColorStop(1, "hsla(0,0%,0%,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function seedParticles(id: LiveWallpaperId, w: number, h: number): P[] {
  const R = Math.random;
  switch (id) {
    case "matrix":
    case "rain": {
      const cols = Math.max(12, Math.floor(w / 16));
      return Array.from({ length: cols }, (_, i) => ({
        x: i * 16 + 2,
        y: R() * -h,
        vy: 2 + R() * 5,
        len: 8 + Math.floor(R() * 18),
        seed: Math.floor(R() * 100),
      }));
    }
    case "starfield":
    case "warp":
      return Array.from({ length: id === "warp" ? 320 : 220 }, () => ({
        x: (R() - 0.5) * w * 2,
        y: (R() - 0.5) * h * 2,
        z: R() * w + 1,
        vz: id === "warp" ? 6 + R() * 10 : 0.8 + R() * 2,
      }));
    case "constellation":
      return Array.from({ length: Math.min(70, Math.floor(w / 18)) }, () => ({
        x: R() * w,
        y: R() * h,
        vx: (R() - 0.5) * 0.5,
        vy: (R() - 0.5) * 0.5,
      }));
    case "meteors":
      return Array.from({ length: 26 }, () => ({
        x: R() * w - w * 0.4,
        y: R() * h - h,
        vx: 5 + R() * 5,
        vy: 3 + R() * 4,
        len: 8 + R() * 14,
        s: 1 + R() * 2,
        a: 0.5 + R() * 0.5,
      }));
    case "snow":
      return Array.from({ length: 160 }, () => ({
        x: R() * w, y: R() * h, vx: 0, vy: 0.4 + R() * 1.4, sway: 0.3 + R() * 0.8,
        s: 1 + R() * 2.4, a: 0.4 + R() * 0.6, t: R() * 6, seed: R() * 6,
      }));
    case "embers":
      return Array.from({ length: 130 }, () => ({
        x: R() * w, y: R() * h, vx: 0, vy: -(0.4 + R() * 1.6), sway: 0.2 + R() * 0.7,
        s: 1 + R() * 2, a: 0.4 + R() * 0.6, t: R() * 6, seed: R() * 90,
      }));
    case "bubbles":
      return Array.from({ length: 70 }, () => ({
        x: R() * w, y: R() * h, vx: 0, vy: -(0.3 + R() * 0.9), sway: 0.2 + R() * 0.6,
        s: 4 + R() * 16, a: 0.5 + R() * 0.5, t: R() * 6, seed: R() * 6,
      }));
    case "fireflies":
      return Array.from({ length: 90 }, () => ({
        x: R() * w, y: R() * h, vx: (R() - 0.5) * 0.4, vy: (R() - 0.5) * 0.4, sway: 0.15 + R() * 0.4,
        s: 1.2 + R() * 2, a: 0.5 + R() * 0.5, t: R() * 6, seed: R() * 6,
      }));
    default:
      return Array.from({ length: 5 }, (_, i) => ({
        t: R() * 100, vx: 0.6 + R() * 0.8, vy: 0.5 + R() * 0.9, s: 0.32 + R() * 0.22, seed: i * 1.7 + R(),
      }));
  }
}

/** Canvas particle backgrounds. Rendered behind all app content. */
export function LiveWallpaper({ id, paused }: { id: LiveWallpaperId | string; paused?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const preset = (ALIASES[id as string] ?? (id as LiveWallpaperId)) || "";

  useEffect(() => {
    if (!preset || paused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let ps: P[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ps = seedParticles(preset, w, h);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const loop = (t: number) => {
      draw(preset, ctx, w, h, ps, t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [preset, paused]);

  if (!preset) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={{ background: BACKDROP[preset] }}>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
