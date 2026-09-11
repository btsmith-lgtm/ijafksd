import splashAsset from "@/assets/splash.png.asset.json";
import novaEmblemAsset from "@/assets/nova-emblem.png.asset.json";

export function LoadingScreen({ splash = false }: { splash?: boolean } = {}) {
  if (splash) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background">
        <img
          src={splashAsset.url}
          alt="Nova splash"
          className="max-h-full max-w-full object-contain animate-fade-up"
        />
      </div>
    );
  }
  return (
    <div className="nova-loader relative flex h-dvh w-full items-center justify-center overflow-hidden bg-background">
      <div className="nova-loader-grid absolute inset-0" aria-hidden="true" />
      <div className="nova-loader-orbit nova-loader-orbit-outer" aria-hidden="true" />
      <div className="nova-loader-orbit nova-loader-orbit-inner" aria-hidden="true" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="nova-loader-emblem-wrap relative">
          <div className="nova-loader-scan absolute inset-0" aria-hidden="true" />
          <img
            src={novaEmblemAsset.url}
            alt="Nova"
            className="nova-loader-emblem h-40 w-40 object-cover sm:h-52 sm:w-52"
          />
        </div>
        <div className="mt-8 text-center">
          <div className="text-2xl font-semibold uppercase tracking-[0.38em] text-foreground sm:text-3xl">
            Nova
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            Initializing system
          </div>
        </div>
        <div className="nova-loader-progress mt-7 h-px w-52 overflow-hidden bg-border sm:w-64">
          <div className="nova-loader-progress-bar h-full bg-primary" />
        </div>
        <div className="mt-3 flex w-52 justify-between font-mono text-[9px] uppercase text-muted-foreground sm:w-64">
          <span>Secure link</span>
          <span>Online</span>
        </div>
      </div>
    </div>
  );
}
