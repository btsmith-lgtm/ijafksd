import { Globe, ExternalLink, MonitorPlay, Tv, GraduationCap } from "lucide-react";

type Site = {
  id: string;
  label: string;
  description: string;
  url: string | null;
  proxy?: boolean;
  icon: React.ComponentType<{ className?: string }>;
};

const SITES: Site[] = [
  {
    id: "nova",
    label: "Nova",
    description: "Regular site",
    url: null,
    icon: Globe,
  },
  {
    id: "cineos",
    label: "CineOS",
    description: "Opens here through the proxy",
    url: "https://cineosweb.github.io",
    proxy: true,
    icon: MonitorPlay,
  },
  {
    id: "beez",
    label: "Beez",
    description: "Opens here through the proxy",
    url: "https://9-16-beez.b-cdn.net/",
    proxy: true,
    icon: Tv,
  },
  {
    id: "opium",
    label: "Opium",
    description: "Clever Learning",
    url: "https://storage.googleapis.com/opiumbest/index.html",
    icon: ExternalLink,
  },
  {
    id: "dogehub",
    label: "Dogehub",
    description: "Canvas LMS",
    url: "https://storage.googleapis.com/canvas-lms/index.html#/",
    icon: ExternalLink,
  },
  {
    id: "lucidetutoring",
    label: "Lucide Tutoring",
    description: "Lucide Tutoring",
    url: "https://storage.googleapis.com/lucidemath/index.html",
    icon: ExternalLink,
  },
];

export function ProxySiteMenu({
  open,
  onClose,
  onSelectNova,
  onSelectProxySite,
}: {
  open: boolean;
  onClose: () => void;
  onSelectNova: () => void;
  onSelectProxySite?: (site: { url: string; label: string }) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass w-full max-w-sm rounded-2xl border border-white/10 p-6 shadow-2xl">
        <div className="mb-1 text-center text-lg font-semibold">Proxy Sites</div>
        <div className="mb-4 text-center text-sm text-muted-foreground">
          Choose where to go
        </div>
        <div className="flex flex-col gap-2">
          {SITES.map((site) => {
            const Icon = site.icon;
            return (
              <button
                key={site.id}
                onClick={() => {
                  if (site.proxy && site.url) {
                    onSelectProxySite?.({ url: site.url, label: site.label });
                  } else if (site.url) {
                    window.open(site.url, "_blank", "noopener,noreferrer");
                  } else {
                    onClose();
                    onSelectNova();
                  }
                }}
                className="group flex items-center gap-3 rounded-xl bg-secondary/40 px-4 py-3 text-left transition-colors hover:bg-secondary/70"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{site.label}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {site.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
