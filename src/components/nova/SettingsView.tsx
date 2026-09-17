import { useEffect, useRef, useState } from "react";
import { parseYouTubeId } from "@/components/nova/BackgroundMusic";
import type { Settings, Bookmark, HistoryEntry, DownloadItem } from "@/lib/store";
import { toast } from "sonner";
import { SimpleListView } from "@/components/nova/SimpleListView";
import { LiveWallpaper, liveWallpapers, type LiveWallpaperId } from "@/components/nova/LiveWallpaper";
import { resetProxy } from "@/lib/scramjet";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { UserRound, Camera, KeyRound, Save, Loader2, LogOut } from "lucide-react";

const wallpapers = [
  "",
  "https://images.unsplash.com/photo-1707343843437-caacff5cfa74?w=1920",
  "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1920",
  "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=1920",
  "https://images.unsplash.com/photo-1502790671504-542ad42d5189?w=1920",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920",
  "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=1920",
  "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920",
  "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=1920",
  "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1920",
  "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=1920",
  "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1920",
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=1920",
  "https://images.unsplash.com/photo-1444080748397-f442aa95c3e5?w=1920",
  "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1920",
  "https://images.unsplash.com/photo-1533130061792-64b345e4a833?w=1920",
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1920",
];

const cloakPresets: { label: string; title: string; icon: string }[] = [
  { label: "Google Classroom", title: "Home - Classroom", icon: "https://ssl.gstatic.com/classroom/ic_product_classroom_32.png" },
  { label: "Google Docs", title: "Google Docs", icon: "https://ssl.gstatic.com/docs/documents/images/kix-favicon-2023q4.ico" },
  { label: "Google Drive", title: "My Drive - Google Drive", icon: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png" },
  { label: "Gmail", title: "Inbox - Gmail", icon: "https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico" },
  { label: "Google Slides", title: "Google Slides", icon: "https://ssl.gstatic.com/docs/presentations/images/favicon5.ico" },
  { label: "Khan Academy", title: "Khan Academy | Free Online Courses", icon: "https://cdn.kastatic.org/images/favicon.ico?logo" },
  { label: "Canvas LMS", title: "Dashboard", icon: "https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico" },
  { label: "Schoology", title: "Home | Schoology", icon: "https://www.schoology.com/sites/all/themes/schoology_responsive/favicon.ico" },
  { label: "Clever", title: "Clever | Portal", icon: "https://apps.clever.com/favicon.ico" },
  { label: "Quizlet", title: "Quizlet", icon: "https://assets.quizlet.com/_next/static/media/favicon.42a24777.ico" },
  { label: "IXL", title: "IXL | Math, Language Arts, Science, Social Studies", icon: "https://www.ixl.com/favicon.ico" },
  { label: "Desmos", title: "Desmos | Graphing Calculator", icon: "https://www.desmos.com/assets/img/apps/graphing/favicon.ico" },
  { label: "NoRedInk", title: "NoRedInk", icon: "https://www.noredink.com/favicon.ico" },
  { label: "Wikipedia", title: "Wikipedia, the free encyclopedia", icon: "https://en.wikipedia.org/static/favicon/wikipedia.ico" },
];

const fonts = ["Inter", "system-ui", "Georgia", "Menlo", "Helvetica"];

const categories = [
  { id: "account", label: "Account" },
  { id: "appearance", label: "Appearance" },
  { id: "live", label: "Live Wallpapers" },
  { id: "music", label: "Music Lobby" },
  { id: "browser", label: "Browser" },
  { id: "privacy", label: "Privacy & Data" },
  { id: "safety", label: "Cloak & Panic" },
  { id: "shortcuts", label: "Shortcuts" },
  { id: "advanced", label: "Advanced" },
] as const;

type Cat = typeof categories[number]["id"];

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

function AccountSection({ session }: { session: Session | null }) {
  const user = session?.user;
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      if (error) {
        toast.error("Couldn't load your profile");
      } else if (data) {
        setProfile(data as ProfileRow);
        setDisplayName(data.display_name ?? "");
        setAvatarUrl(data.avatar_url);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() || null, avatar_url: avatarUrl })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save profile");
    } else {
      toast.success("Profile saved");
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      toast.error(error.message || "Couldn't update password");
    } else {
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error("Image must be under 1 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setAvatarUrl(url);
    };
    reader.readAsDataURL(file);
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <Group title="Account">
          <p className="text-sm text-muted-foreground">Sign in to manage your account.</p>
        </Group>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading account…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Group title="Profile">
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-glass-border" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/15 text-primary ring-2 ring-glass-border">
                <UserRound className="h-7 w-7" />
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground shadow"
              title="Change picture"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPickFile}
              className="hidden"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{profile?.username ?? user.email}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs text-muted-foreground">Display name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="What should people call you?"
            className="w-full rounded-lg border border-glass-border bg-white/5 px-3 py-2 text-sm outline-none"
          />
        </label>

        <button
          onClick={saveProfile}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save profile
        </button>
      </Group>

      <Group title="Change password">
        <form onSubmit={changePassword} className="space-y-3">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="w-full rounded-lg border border-glass-border bg-white/5 px-3 py-2 text-sm outline-none"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-lg border border-glass-border bg-white/5 px-3 py-2 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={saving || !newPassword}
            className="flex items-center gap-2 rounded-xl border border-glass-border px-4 py-2 text-sm transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            <KeyRound className="h-4 w-4" />
            Update password
          </button>
        </form>
      </Group>

      <Group title="Session">
        <p className="text-xs text-muted-foreground">
          Signed in as {profile?.username ?? user.email}. Signing out returns you to the sign-in screen.
        </p>
        <button
          onClick={async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              toast.error("Couldn't sign out");
            } else {
              toast.success("Signed out");
            }
          }}
          className="flex items-center gap-2 rounded-xl border border-destructive/40 px-4 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </Group>
    </div>
  );
}

export function SettingsView({
  session, settings, onChange, onReset,
  bookmarks, history, downloads,
  onOpenUrl, onDeleteBookmark, onDeleteHistory, onClearHistory, onDeleteDownload,
}: {
  session: Session | null;
  settings: Settings;
  onChange: (patch: Settings | ((s: Settings) => Settings)) => void;
  onReset: () => void;
  bookmarks: Bookmark[];
  history: HistoryEntry[];
  downloads: DownloadItem[];
  onOpenUrl: (url: string) => void;
  onDeleteBookmark: (url: string) => void;
  onDeleteHistory: (index: number) => void;
  onClearHistory: () => void;
  onDeleteDownload: (index: number) => void;
}) {
  const [cat, setCat] = useState<Cat>("appearance");
  const set = (patch: Partial<Settings>) => onChange((s) => ({ ...s, ...patch }));

  return (
    <div className="flex h-full min-h-0 gap-3 p-3">
      <aside className="glass w-56 shrink-0 rounded-2xl p-2" style={{ borderRadius: "var(--radius)" }}>
        <div className="mb-2 px-3 pt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Settings
        </div>
        <nav className="flex flex-col gap-1">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                cat === c.id ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-white/5"
              }`}
            >
              {c.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="glass flex-1 min-w-0 overflow-y-auto rounded-2xl p-6" style={{ borderRadius: "var(--radius)" }}>
        {cat === "account" && <AccountSection session={session} />}

        {cat === "music" && (
          <div className="space-y-6">
            <Group title="Music lobby">
              <p className="mb-3 text-xs text-muted-foreground">
                Paste a YouTube link and it loops in the background automatically, like Minecraft music.
              </p>
              <label className="mb-1 block text-xs text-muted-foreground">YouTube link or video ID</label>
              <input
                value={settings.musicUrl}
                onChange={(e) => set({ musicUrl: e.target.value, musicEnabled: true })}
                placeholder="https://www.youtube.com/watch?v=..."
                className="mb-3 w-full rounded-xl border border-glass-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
              />
              {settings.musicUrl && !parseYouTubeId(settings.musicUrl) && (
                <p className="mb-3 text-xs text-destructive">That doesn't look like a YouTube link.</p>
              )}
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm">Play music</span>
                <button
                  onClick={() => set({ musicEnabled: !settings.musicEnabled })}
                  className={`rounded-xl border px-4 py-2 text-sm ${
                    settings.musicEnabled ? "border-primary bg-primary/15" : "border-glass-border hover:bg-white/5"
                  }`}
                >
                  {settings.musicEnabled ? "On" : "Off"}
                </button>
              </div>
              <label className="mb-1 block text-xs text-muted-foreground">Volume ({settings.musicVolume}%)</label>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.musicVolume}
                onChange={(e) => set({ musicVolume: Number(e.target.value) })}
                className="w-full accent-[hsl(var(--primary))]"
              />
              <p className="mt-3 text-xs text-muted-foreground">
                If your browser blocks sound at first, click anywhere once and it starts.
              </p>
            </Group>
          </div>
        )}

        {cat === "live" && (
          <div className="space-y-6">
            <Group title="Live wallpapers">
              <p className="mb-3 text-xs text-muted-foreground">
                Animated backgrounds that move behind Nova. They render on top of your static wallpaper.
              </p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {liveWallpapers.map((lw) => {
                  const active = (settings.liveWallpaper || "") === lw.id;
                  return (
                    <button
                      key={lw.id || "off"}
                      onClick={() => set({ liveWallpaper: lw.id })}
                      className={`relative aspect-video overflow-hidden rounded-xl border-2 transition-all ${
                        active ? "border-primary" : "border-glass-border hover:border-white/20"
                      }`}
                    >
                      <div className="absolute inset-0 scale-[0.999]">
                        {lw.id ? (
                          <div className="absolute inset-0 [&>div]:!absolute [&>div]:!inset-0 [&>div]:!z-0">
                            <LiveWallpaper id={lw.id} />
                          </div>
                        ) : (
                          <div className="absolute inset-0" style={{ backgroundImage: "var(--gradient-mesh)" }} />
                        )}
                      </div>
                      <span className="absolute inset-x-0 bottom-0 bg-black/45 py-1 text-center text-xs font-medium text-white">
                        {lw.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Group>
          </div>
        )}

        {cat === "appearance" && (
          <div className="space-y-6">
            <Group title="Theme">
              <div className="flex gap-2">
                {(["dark", "light"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => set({ theme: t })}
                    className={`flex-1 rounded-xl border px-4 py-3 text-sm capitalize ${
                      settings.theme === t ? "border-primary bg-primary/15" : "border-glass-border hover:bg-white/5"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Group>
            <Group title="Accent color">
              <div className="flex flex-wrap gap-2">
                {["#a78bfa", "#60a5fa", "#34d399", "#f472b6", "#fb923c", "#f43f5e", "#facc15"].map((c) => (
                  <button
                    key={c}
                    onClick={() => set({ accent: c })}
                    className={`h-9 w-9 rounded-xl ring-offset-2 ring-offset-background transition-all ${settings.accent === c ? "ring-2 ring-primary" : ""}`}
                    style={{ background: c }}
                  />
                ))}
                <input
                  type="color"
                  value={settings.accent}
                  onChange={(e) => set({ accent: e.target.value })}
                  className="h-9 w-9 cursor-pointer rounded-xl border border-glass-border bg-transparent"
                />
              </div>
            </Group>
            <Group title="Wallpaper">
              <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
                {wallpapers.map((w, i) => (
                  <button
                    key={i}
                    onClick={() => set({ wallpaper: w })}
                    className={`aspect-video rounded-xl border-2 bg-cover bg-center transition-all ${
                      settings.wallpaper === w ? "border-primary" : "border-glass-border"
                    }`}
                    style={{ backgroundImage: w ? `url(${w})` : "var(--gradient-mesh)" }}
                  >
                    {!w && <span className="text-xs text-muted-foreground">None</span>}
                  </button>
                ))}
              </div>
              <input
                placeholder="Custom image URL"
                value={settings.wallpaper}
                onChange={(e) => set({ wallpaper: e.target.value })}
                className="mt-3 w-full rounded-lg border border-glass-border bg-white/5 px-3 py-2 text-sm outline-none"
              />
            </Group>
            <Group title="Font">
              <select
                value={settings.fontFamily}
                onChange={(e) => set({ fontFamily: e.target.value })}
                className="w-full rounded-lg border border-glass-border bg-white/5 px-3 py-2 text-sm outline-none"
              >
                {fonts.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Group>
            <Slider label={`Border radius — ${settings.radius}px`} min={0} max={28} value={settings.radius}
                    onChange={(v) => set({ radius: v })} />
            <Slider label={`Transparency — ${settings.transparency}%`} min={10} max={95} value={settings.transparency}
                    onChange={(v) => set({ transparency: v })} />
            <Slider label={`Blur — ${settings.blur}px`} min={0} max={40} value={settings.blur}
                    onChange={(v) => set({ blur: v })} />
            <Toggle label="Animations" checked={settings.animations} onChange={(v) => set({ animations: v })} />
            <Group title="Sidebar position">
              <div className="flex gap-2">
                {(["left", "right"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => set({ sidebarPos: p })}
                    className={`flex-1 rounded-xl border px-4 py-2 text-sm capitalize ${
                      settings.sidebarPos === p ? "border-primary bg-primary/15" : "border-glass-border hover:bg-white/5"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </Group>
            <Group title="Cursor">
              <div className="space-y-3">
                <Toggle
                  label="Custom cursor"
                  checked={settings.cursorEnabled}
                  onChange={(v) => set({ cursorEnabled: v })}
                />
                <div className="flex flex-wrap gap-2">
                  {["🖕", "👆", "👉", "👌", "✌️", "🤙", "👊", "🔥", "⭐", "🎯", "✨", "💀"].map((e) => (
                    <button
                      key={e}
                      onClick={() => set({ cursorEmoji: e })}
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border text-2xl transition-colors ${
                        settings.cursorEmoji === e ? "border-primary bg-primary/15" : "border-glass-border hover:bg-white/5"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <input
                  placeholder="Custom emoji"
                  value={settings.cursorEmoji}
                  onChange={(e) => set({ cursorEmoji: e.target.value.slice(0, 4) })}
                  className="w-full rounded-lg border border-glass-border bg-white/5 px-3 py-2 text-lg outline-none"
                />
                <Slider
                  label={`Size — ${settings.cursorSize}px`}
                  min={16}
                  max={96}
                  value={settings.cursorSize}
                  onChange={(v) => set({ cursorSize: v })}
                />
                <Slider
                  label={`Rotation — ${settings.cursorRotation}°`}
                  min={-180}
                  max={180}
                  value={settings.cursorRotation}
                  onChange={(v) => set({ cursorRotation: v })}
                />
                <div className="flex items-center gap-3 rounded-xl border border-glass-border px-4 py-3">
                  <span className="text-sm text-muted-foreground">Preview</span>
                  <span
                    style={{
                      fontSize: `${settings.cursorSize}px`,
                      transform: `rotate(${settings.cursorRotation}deg)`,
                      lineHeight: 1,
                      display: "inline-block",
                    }}
                  >
                    {settings.cursorEmoji || "🖕"}
                  </span>
                </div>
              </div>
            </Group>
          </div>
        )}

        {cat === "browser" && (
          <div className="space-y-6">
            <Group title="Startup page">
              <div className="flex gap-2">
                {(["home", "browser"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => set({ startupPage: p })}
                    className={`flex-1 rounded-xl border px-4 py-2 text-sm capitalize ${
                      settings.startupPage === p ? "border-primary bg-primary/15" : "border-glass-border hover:bg-white/5"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </Group>
            <Group title="Proxy engine">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {([
                  ["scramjet", "Scramjet"],
                  ["ultraviolet", "Ultraviolet"],
                  ["chemical", "Chemical.js"],
                  ["epoxy", "Epoxy"],
                  ["wonginx", "Wonginx"],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => set({ proxyEngine: id })}
                    className={`rounded-xl border px-4 py-2 text-sm ${
                      settings.proxyEngine === id ? "border-primary bg-primary/15" : "border-glass-border hover:bg-white/5"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Switching engines reloads the proxy. Try the other one if a site refuses to load. Wonginx needs a <code>/wonginx/index.mjs</code> transport file to work.
              </p>
            </Group>
            <Group title="Proxy server">
              <p className="text-xs text-muted-foreground">
                Nova proxies sites through its own built-in server — there's no external Wisp endpoint to configure. The connection is monitored and auto-reconnects if it drops.
              </p>
              <button
                onClick={() => {
                  toast.info("Resetting proxy and reloading…");
                  void resetProxy();
                }}
                className="mt-3 rounded-xl border border-glass-border px-4 py-2 text-sm hover:bg-white/5"
              >
                Reset proxy & reload
              </button>
            </Group>

            <Group title="Search engine">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {(["duckduckgo", "google", "bing", "brave"] as const).map((e) => (
                  <button
                    key={e}
                    onClick={() => set({ searchEngine: e })}
                    className={`rounded-xl border px-4 py-3 text-sm capitalize ${
                      settings.searchEngine === e ? "border-primary bg-primary/15" : "border-glass-border hover:bg-white/5"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </Group>
          </div>
        )}

        {cat === "privacy" && (
          <div className="space-y-8">
            <Group title="Data">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { localStorage.removeItem("nova.history"); toast.success("History cleared"); }}
                  className="rounded-xl border border-glass-border px-4 py-2 text-sm hover:bg-white/5"
                >Clear history</button>
                <button
                  onClick={() => { localStorage.removeItem("nova.bookmarks"); toast.success("Bookmarks cleared"); }}
                  className="rounded-xl border border-glass-border px-4 py-2 text-sm hover:bg-white/5"
                >Clear bookmarks</button>
                <button
                  onClick={() => { localStorage.clear(); location.reload(); }}
                  className="rounded-xl border border-destructive/50 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                >Wipe all data</button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Nova stores everything locally in your browser. Nothing leaves your device except proxied browsing traffic through Nova's built-in proxy server.</p>
            </Group>

            <SimpleListView
              title="Bookmarks"
              items={bookmarks.map((b) => ({ title: b.title, subtitle: b.url, at: b.at }))}
              emptyLabel="No bookmarks yet"
              onOpen={(i) => onOpenUrl(bookmarks[i].url)}
              onDelete={(i) => onDeleteBookmark(bookmarks[i].url)}
            />

            <SimpleListView
              title="History"
              items={history.map((h) => ({ title: h.title, subtitle: h.url, at: h.at }))}
              emptyLabel="Nothing here yet"
              onOpen={(i) => onOpenUrl(history[i].url)}
              onDelete={onDeleteHistory}
              clearAll={onClearHistory}
            />

            <SimpleListView
              title="Downloads"
              items={downloads.map((d) => ({ title: d.name, subtitle: d.url, at: d.at }))}
              emptyLabel="No downloads yet"
              onOpen={(i) => onOpenUrl(downloads[i].url)}
              onDelete={onDeleteDownload}
            />
          </div>
        )}

        {cat === "safety" && (
          <div className="space-y-6">
            <Group title="Panic URL">
              <input
                value={settings.panicUrl}
                onChange={(e) => set({ panicUrl: e.target.value })}
                placeholder="https://classroom.google.com"
                className="w-full rounded-lg border border-glass-border bg-white/5 px-3 py-2 text-sm outline-none"
              />
              <p className="mt-1 text-xs text-muted-foreground">Where the page redirects when you hit the panic key.</p>
            </Group>
            <Group title="Panic key">
              <div className="flex items-center gap-3">
                <kbd className="rounded-md border border-glass-border bg-white/5 px-3 py-1.5 font-mono text-sm">
                  {settings.panicKey || "—"}
                </kbd>
                <input
                  type="text"
                  inputMode="text"
                  value=""
                  placeholder="Tap & press a key"
                  onKeyDown={(ev) => {
                    if (ev.key === "Tab") return;
                    ev.preventDefault();
                    set({ panicKey: ev.key });
                    toast.success(`Panic key set to "${ev.key}"`);
                    (ev.target as HTMLInputElement).blur();
                  }}
                  onChange={(ev) => {
                    const v = ev.target.value;
                    if (!v) return;
                    const k = v.slice(-1);
                    set({ panicKey: k });
                    toast.success(`Panic key set to "${k}"`);
                    ev.target.blur();
                  }}
                  className="w-40 rounded-xl border border-glass-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50"
                />
                <button
                  onClick={() => set({ panicKey: "" })}
                  className="rounded-xl border border-glass-border px-4 py-2 text-sm hover:bg-white/5"
                >
                  Clear
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Tap the box, then press or type the key you want. Works on mobile & desktop.</p>
            </Group>
            <button
              onClick={() => {
                if (!settings.panicUrl) return toast.error("Set a panic URL first");
                window.location.href = settings.panicUrl;
              }}
              className="rounded-xl border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              Test panic
            </button>
          </div>
        )}

        {cat === "safety" && (
          <div className="space-y-6">
            <Group title="Preview">
              <div className="glass flex items-center gap-3 rounded-xl border border-glass-border px-4 py-3">
                {settings.cloakFavicon ? (
                  <img src={settings.cloakFavicon} alt="" className="h-5 w-5 rounded-sm" />
                ) : (
                  <div className="h-5 w-5 rounded-sm bg-white/10" />
                )}
                <span className="truncate text-sm">{settings.cloakTitle || "Nova"}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">This is what your browser tab will look like.</p>
            </Group>

            <Group title="Presets">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {cloakPresets.map((p) => {
                  const icon = p.icon;
                  const active = settings.cloakTitle === p.title && settings.cloakFavicon === icon;
                  return (
                    <button
                      key={p.label}
                      onClick={() => {
                        set({ cloakTitle: p.title, cloakFavicon: icon });
                        toast.success(`Cloaked as ${p.label}`);
                      }}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                        active ? "border-primary bg-primary/15" : "border-glass-border hover:bg-white/5"
                      }`}
                    >
                      <img src={icon} alt="" className="h-4 w-4 shrink-0 rounded-sm" />
                      <span className="truncate">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </Group>

            <Group title="Custom tab title">
              <input
                value={settings.cloakTitle}
                onChange={(e) => set({ cloakTitle: e.target.value })}
                placeholder="e.g. Home"
                className="w-full rounded-lg border border-glass-border bg-white/5 px-3 py-2 text-sm outline-none"
              />
            </Group>

            <Group title="Custom favicon URL">
              <input
                value={settings.cloakFavicon}
                onChange={(e) => set({ cloakFavicon: e.target.value })}
                placeholder="https://www.google.com/s2/favicons?domain=example.com&sz=64"
                className="w-full rounded-lg border border-glass-border bg-white/5 px-3 py-2 text-sm outline-none"
              />
            </Group>

            <button
              onClick={() => {
                set({ cloakTitle: "", cloakFavicon: "" });
                toast.success("Cloak cleared");
              }}
              className="rounded-xl border border-glass-border px-4 py-2 text-sm hover:bg-white/5"
            >
              Reset to Nova
            </button>
          </div>
        )}

        {cat === "shortcuts" && (
          <div className="space-y-2 text-sm">
            {[
              ["⌘/Ctrl + T", "New tab"],
              ["⌘/Ctrl + L", "Focus address bar"],
              ["⌘/Ctrl + ,", "Open settings"],
              ["F11", "Fullscreen (browser)"],
              ["Esc", "Exit fullscreen"],
            ].map(([k, v]) => (
              <div key={k} className="glass flex items-center justify-between rounded-xl px-4 py-2">
                <span>{v}</span>
                <kbd className="rounded-md border border-glass-border bg-white/5 px-2 py-0.5 font-mono text-xs">{k}</kbd>
              </div>
            ))}
          </div>
        )}

        {cat === "advanced" && (
          <div className="space-y-6">
            <Group title="Custom CSS">
              <textarea
                value={settings.customCss}
                onChange={(e) => set({ customCss: e.target.value })}
                placeholder="/* your CSS */"
                className="h-40 w-full rounded-lg border border-glass-border bg-white/5 p-3 font-mono text-xs outline-none"
              />
            </Group>
            <Group title="Custom JavaScript">
              <textarea
                value={settings.customJs}
                onChange={(e) => set({ customJs: e.target.value })}
                placeholder="// runs on app load"
                className="h-40 w-full rounded-lg border border-glass-border bg-white/5 p-3 font-mono text-xs outline-none"
              />
            </Group>
            <button
              onClick={onReset}
              className="rounded-xl border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
            >Reset all settings</button>
          </div>
        )}

      </section>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-glass-border px-4 py-3">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-primary" : "bg-white/10"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

function Slider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span>{label}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}
