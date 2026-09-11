import { Trash2, ExternalLink } from "lucide-react";

export type ListRow = { title: string; subtitle: string; at: number };

export function SimpleListView({
  title, items, emptyLabel, onOpen, onDelete, clearAll,
}: {
  title: string;
  items: ListRow[];
  emptyLabel: string;
  onOpen: (index: number) => void;
  onDelete: (index: number) => void;
  clearAll?: () => void;
}) {
  return (
    <div className="h-full overflow-y-auto p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{items.length} item{items.length === 1 ? "" : "s"}</p>
          </div>
          {clearAll && items.length > 0 && (
            <button
              onClick={clearAll}
              className="rounded-xl border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
            >Clear all</button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="glass grid place-items-center rounded-2xl p-16 text-center text-sm text-muted-foreground"
               style={{ borderRadius: "var(--radius)" }}>
            {emptyLabel}
          </div>
        ) : (
          <div className="glass divide-y divide-glass-border overflow-hidden rounded-2xl"
               style={{ borderRadius: "var(--radius)" }}>
            {items.map((it, i) => (
              <div key={i} className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 hover:bg-white/5">
                <button onClick={() => onOpen(i)} className="min-w-0 text-left">
                  <div className="truncate text-sm font-medium">{it.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{it.subtitle}</div>
                </button>
                <div className="flex items-center gap-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="mr-2 text-xs">{new Date(it.at).toLocaleString()}</span>
                  <button onClick={() => onOpen(i)} className="rounded-md p-1.5 hover:bg-white/10" aria-label="Open">
                    <ExternalLink className="h-4 w-4" />
                  </button>
                  <button onClick={() => onDelete(i)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
