import { useEffect, useMemo, useState } from "react";
import { Search, Clock, Calendar, StickyNote, ListTodo, Calculator, Plus, X } from "lucide-react";
import type { Settings, Bookmark, HistoryEntry } from "@/lib/store";
import { useLocalStorage } from "@/lib/store";

const greet = (d: Date) => {
  const h = d.getHours();
  if (h < 5) return "Good Night";
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
};

const quickShortcuts = [
  { name: "YouTube", url: "https://youtube.com", color: "#ff0033" },
  { name: "GitHub", url: "https://github.com", color: "#8b5cf6" },
  { name: "Wikipedia", url: "https://wikipedia.org", color: "#0ea5e9" },
  { name: "Reddit", url: "https://reddit.com", color: "#f97316" },
  { name: "Twitter", url: "https://twitter.com", color: "#38bdf8" },
  { name: "Discord", url: "https://discord.com", color: "#5865f2" },
];

export function HomeView({
  settings, bookmarks, history, onOpen,
}: {
  settings: Settings;
  bookmarks: Bookmark[];
  history: HistoryEntry[];
  onOpen: (u: string) => void;
  onGoBrowser: () => void;
}) {
  const [now, setNow] = useState(new Date());
  const [q, setQ] = useState("");
  const [pinned, setPinned] = useLocalStorage<{ name: string; url: string }[]>(
    "nova.pinned",
    quickShortcuts.slice(0, 6).map((s) => ({ name: s.name, url: s.url })),
  );
  const [notes, setNotes] = useLocalStorage<string>("nova.notes", "");
  const [todos, setTodos] = useLocalStorage<{ text: string; done: boolean }[]>("nova.todos", []);
  const [newTodo, setNewTodo] = useState("");

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const recent = useMemo(() => {
    const seen = new Set<string>();
    return history.filter((h) => {
      if (seen.has(h.url)) return false;
      seen.add(h.url);
      return true;
    }).slice(0, 6);
  }, [history]);

  return (
    <div className="h-full overflow-y-auto p-6 md:p-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        {/* Greeting + clock */}
        <div className="animate-fade-up grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
              <span className="gradient-text">{greet(now)}</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="glass shrink-0 rounded-2xl px-5 py-3 text-right"
               style={{ borderRadius: "var(--radius)" }}>
            <div className="font-mono text-2xl font-semibold md:text-3xl tabular-nums">
              {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </div>
          </div>
        </div>

        {/* Search */}
        <form
          onSubmit={(e) => { e.preventDefault(); if (q.trim()) { onOpen(q); setQ(""); } }}
          className="animate-fade-up group relative"
        >
          <div className="glass-strong flex items-center gap-3 rounded-2xl px-5 py-4 shadow-[var(--shadow-elevated)] transition-all focus-within:ring-2 focus-within:ring-primary/40"
               style={{ borderRadius: "var(--radius)" }}>
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${settings.searchEngine} or enter a URL`}
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <kbd className="hidden rounded-md border border-glass-border bg-white/5 px-2 py-1 text-[10px] text-muted-foreground md:block">
              Enter
            </kbd>
          </div>
        </form>

        {/* Pinned shortcuts */}
        <section className="animate-fade-up">
          <SectionTitle>Pinned</SectionTitle>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {pinned.map((s) => (
              <div
                key={s.url}
                onClick={() => onOpen(s.url)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(s.url); }}}
                className="glass hover-lift group relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl p-3 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                style={{ borderRadius: "var(--radius)" }}
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl text-sm font-bold text-white"
                     style={{ background: `linear-gradient(135deg, ${quickShortcuts.find(c => c.url === s.url)?.color ?? "var(--primary)"}, var(--primary))` }}>
                  {s.name[0]}
                </div>
                <span className="truncate text-xs font-medium">{s.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setPinned(pinned.filter((p) => p.url !== s.url)); }}
                  className="absolute right-1.5 top-1.5 hidden rounded-full bg-black/40 p-0.5 text-white group-hover:block"
                  aria-label="Unpin"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {pinned.length < 12 && (
              <AddPinned onAdd={(p) => setPinned([...pinned, p])} />
            )}
          </div>
        </section>

        {/* Recent + Favorites row */}
        <div className="grid gap-6 md:grid-cols-2">
          <section className="animate-fade-up">
            <SectionTitle>Recently visited</SectionTitle>
            <div className="glass flex flex-col divide-y divide-glass-border rounded-2xl p-2"
                 style={{ borderRadius: "var(--radius)" }}>
              {recent.length === 0 && <Empty label="Your history will show up here" />}
              {recent.map((h) => (
                <button
                  key={h.url + h.at}
                  onClick={() => onOpen(h.url)}
                  className="ripple flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/5"
                >
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm">{h.title || h.url}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(h.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="animate-fade-up">
            <SectionTitle>Favorites</SectionTitle>
            <div className="glass flex flex-col divide-y divide-glass-border rounded-2xl p-2"
                 style={{ borderRadius: "var(--radius)" }}>
              {bookmarks.length === 0 && <Empty label="Bookmark pages to see them here" />}
              {bookmarks.slice(0, 6).map((b) => (
                <button
                  key={b.url}
                  onClick={() => onOpen(b.url)}
                  className="ripple flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/5"
                >
                  <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span className="min-w-0 flex-1 truncate text-sm">{b.title || b.url}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Widgets */}
        <section className="animate-fade-up">
          <SectionTitle>Widgets</SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            <Widget icon={<StickyNote className="h-4 w-4" />} title="Notes">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Jot something down…"
                className="h-32 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </Widget>

            <Widget icon={<ListTodo className="h-4 w-4" />} title="Todo">
              <form
                onSubmit={(e) => { e.preventDefault(); if (!newTodo.trim()) return; setTodos([{ text: newTodo, done: false }, ...todos]); setNewTodo(""); }}
                className="mb-2 flex gap-2"
              >
                <input
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  placeholder="Add task"
                  className="flex-1 rounded-lg border border-glass-border bg-white/5 px-3 py-1.5 text-sm outline-none"
                />
                <button className="rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
                  <Plus className="h-4 w-4" />
                </button>
              </form>
              <ul className="max-h-24 space-y-1 overflow-y-auto text-sm">
                {todos.map((t, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => setTodos(todos.map((x, idx) => idx === i ? { ...x, done: !x.done } : x))}
                      className="accent-primary"
                    />
                    <span className={t.done ? "line-through text-muted-foreground" : ""}>{t.text}</span>
                    <button onClick={() => setTodos(todos.filter((_, idx) => idx !== i))}
                            className="ml-auto text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
                {todos.length === 0 && <li className="text-xs text-muted-foreground">Nothing to do 🎉</li>}
              </ul>
            </Widget>

            <Widget icon={<Calculator className="h-4 w-4" />} title="Calculator">
              <CalcWidget />
            </Widget>

            <Widget icon={<Calendar className="h-4 w-4" />} title="Today">
              <div className="text-sm text-muted-foreground">
                Week {Math.ceil((((+now - +new Date(now.getFullYear(), 0, 1)) / 86400000) + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7)} · Day {Math.ceil(((+now - +new Date(now.getFullYear(), 0, 1)) / 86400000))}
              </div>
              <div className="mt-2 text-3xl font-bold tabular-nums">
                {now.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
              </div>
            </Widget>
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{children}</h2>;
}

function Empty({ label }: { label: string }) {
  return <div className="p-6 text-center text-sm text-muted-foreground">{label}</div>;
}

function Widget({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="glass hover-lift rounded-2xl p-4" style={{ borderRadius: "var(--radius)" }}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/20 text-primary">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function AddPinned({ onAdd }: { onAdd: (p: { name: string; url: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="glass flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl p-3 text-muted-foreground hover:text-foreground"
        style={{ borderRadius: "var(--radius)" }}
      >
        <Plus className="h-6 w-6" />
        <span className="text-xs">Add</span>
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (name && url) { onAdd({ name, url: url.startsWith("http") ? url : `https://${url}` }); setName(""); setUrl(""); setOpen(false); } }}
      className="glass-strong col-span-2 flex flex-col gap-2 rounded-2xl p-3"
      style={{ borderRadius: "var(--radius)" }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name"
             className="rounded-md border border-glass-border bg-white/5 px-2 py-1.5 text-sm outline-none" />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL"
             className="rounded-md border border-glass-border bg-white/5 px-2 py-1.5 text-sm outline-none" />
      <div className="flex gap-2">
        <button className="flex-1 rounded-md bg-primary py-1 text-xs font-medium text-primary-foreground">Add</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md px-2 py-1 text-xs text-muted-foreground">Cancel</button>
      </div>
    </form>
  );
}

function CalcWidget() {
  const [expr, setExpr] = useState("");
  const [out, setOut] = useState<string>("");
  const compute = () => {
    try {
      // eslint-disable-next-line no-new-func
      const r = Function(`"use strict"; return (${expr.replace(/[^-()\d/*+.%\s]/g, "")})`)();
      setOut(String(r));
    } catch { setOut("Error"); }
  };
  return (
    <div>
      <input
        value={expr}
        onChange={(e) => setExpr(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") compute(); }}
        placeholder="e.g. 42 * 1.15"
        className="w-full rounded-lg border border-glass-border bg-white/5 px-3 py-1.5 text-sm outline-none"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-lg font-semibold gradient-text">{out || "—"}</span>
        <button onClick={compute} className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">=</button>
      </div>
    </div>
  );
}
