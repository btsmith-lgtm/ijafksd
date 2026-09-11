import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { initScramjet, useProxySrc } from "@/lib/scramjet";

export function ProxyFrameView({
  url,
  title,
  onBack,
}: {
  url: string;
  title: string;
  onBack: () => void;
}) {
  useEffect(() => {
    void initScramjet("");
  }, []);

  const src = useProxySrc(url);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <span className="text-sm text-muted-foreground">{title}</span>
      </div>
      {src ? (
        <iframe
          src={src}
          title={title}
          className="h-full w-full flex-1 border-0 bg-background"
          sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
          Connecting to proxy…
        </div>
      )}
    </div>
  );
}
