const apps = [
  { name: "Gmail", url: "https://mail.google.com", color: "#ea4335" },
  { name: "Spotify", url: "https://open.spotify.com", color: "#1db954" },
  { name: "GitHub", url: "https://github.com", color: "#8b5cf6" },
  { name: "ChatGPT", url: "https://chat.openai.com", color: "#10a37f" },
  { name: "Twitch", url: "https://twitch.tv", color: "#9146ff" },
  { name: "YouTube", url: "https://youtube.com", color: "#ff0033" },
  { name: "Wikipedia", url: "https://wikipedia.org", color: "#0ea5e9" },
  { name: "GeForce Now", url: "https://play.geforcenow.com", color: "#76b900" },
  { name: "Discord", url: "https://discord.com/app", color: "#5865f2" },
  { name: "Instagram", url: "https://instagram.com", color: "#e1306c" },
  { name: "Pinterest", url: "https://pinterest.com", color: "#e60023" },
];

export function AppsView({ onOpen }: { onOpen: (url: string) => void }) {
  return (
    <div className="h-full overflow-y-auto p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold tracking-tight">Apps</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quick-launch web apps through Nova's proxy.</p>
        <div className="mt-8 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {apps.map((a) => (
            <button
              key={a.url}
              onClick={() => onOpen(a.url)}
              className="glass hover-lift flex aspect-square flex-col items-center justify-center gap-3 rounded-2xl p-4 text-center"
              style={{ borderRadius: "var(--radius)" }}
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl text-xl font-black text-white"
                   style={{ background: `linear-gradient(135deg, ${a.color}, var(--primary))` }}>
                {a.name[0]}
              </div>
              <span className="text-sm font-medium">{a.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
