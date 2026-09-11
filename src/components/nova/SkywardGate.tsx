import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ChevronDown,
  Facebook,
  Linkedin,
  Menu,
  Play,
  Search,
  Twitter,
  X,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/skyward-classroom-hero.jpg";

const UNLOCK_CODE = "1111";
const SITE = "https://www.skyward.com";

const NAV = [
  ["Products", `${SITE}/products`, true],
  ["Reviews", `${SITE}/reviews`, true],
  ["Events", `${SITE}/events`, false],
  ["Support", "https://support.skyward.com/", true],
  ["Blogs", `${SITE}/resources/blog`, true],
  ["About", `${SITE}/company/about-us`, true],
] as const;

function Ext({ href, className, children, ariaLabel }: {
  href: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        window.location.assign(href);
      }}
    >
      {children}
    </a>
  );
}

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3 text-skyward-on-dark">
      <svg
        className={compact ? "h-10 w-[104px]" : "h-12 w-[126px]"}
        viewBox="0 0 126 48"
        role="img"
        aria-label="Skyward"
      >
        <path d="M4 17C29-2 57-2 92 2" fill="none" stroke="currentColor" strokeWidth="2.3" />
        <path d="M5 20C32 2 60 2 94 6" fill="none" stroke="currentColor" strokeWidth="2.3" />
        <path d="M8 23C36 7 63 7 95 10" fill="none" stroke="currentColor" strokeWidth="2.3" />
        <text x="4" y="43" fill="currentColor" fontFamily="Outfit, sans-serif" fontSize="17" fontWeight="700" letterSpacing="4">SKYWARD</text>
      </svg>
    </span>
  );
}

/** Skyward-style cover page. Entering 1111 in Search unlocks Nova. */
export function SkywardGate({ onUnlock }: { onUnlock: () => void }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!searchOpen) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const updateQuery = (value: string) => {
    setQuery(value);
    if (value.trim() === UNLOCK_CODE) onUnlock();
  };

  const submitSearch = () => {
    if (query.trim() === UNLOCK_CODE) {
      onUnlock();
    } else if (query.trim()) {
      window.location.assign(`${SITE}/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="h-dvh w-full overflow-y-auto bg-skyward-surface font-skyward text-skyward-ink">
      <header className="relative z-40">
        <div className="bg-skyward-deep">
          <div className="mx-auto flex h-16 max-w-[1440px] items-stretch px-4 sm:px-6 lg:px-8">
            <Ext href={SITE} ariaLabel="Skyward home" className="flex items-center">
              <Wordmark />
            </Ext>
            <div className="ml-auto hidden items-stretch sm:flex">
              <Ext
                href="https://skyward.iscorp.com/"
                className="flex min-w-28 items-center justify-center gap-3 px-5 text-base font-medium text-skyward-on-dark transition-colors hover:bg-skyward-deep-hover"
              >
                <ArrowRight className="h-5 w-5 rotate-180" /> Log in
              </Ext>
              <Ext
                href={`${SITE}/get-started`}
                className="flex min-w-40 items-center justify-center gap-3 bg-skyward-action px-6 text-base font-semibold text-skyward-action-foreground transition-colors hover:bg-skyward-action-hover"
              >
                <ArrowRight className="h-5 w-5" /> Get started
              </Ext>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              onClick={() => setMobileOpen((open) => !open)}
              className="my-auto ml-auto text-skyward-on-dark hover:bg-skyward-deep-hover hover:text-skyward-on-dark sm:hidden"
            >
              {mobileOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        <div className="bg-skyward-nav text-skyward-on-dark shadow-sm">
          <div className="mx-auto flex min-h-16 max-w-[1440px] items-center px-4 sm:px-6 lg:px-8">
            <nav aria-label="Main navigation" className="hidden h-16 items-center gap-10 lg:flex">
              {NAV.map(([label, href, dropdown]) => (
                <Ext key={label} href={href} className="flex h-full items-center gap-2 text-base font-medium transition-opacity hover:opacity-75">
                  {label}
                  {dropdown && <ChevronDown className="h-4 w-4" />}
                </Ext>
              ))}
            </nav>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSearchOpen(true)}
              className="ml-auto h-11 px-3 text-base text-skyward-on-dark hover:bg-skyward-nav-hover hover:text-skyward-on-dark"
            >
              <Search className="h-5 w-5" /> Search
            </Button>
          </div>
          {mobileOpen && (
            <nav aria-label="Mobile navigation" className="border-t border-skyward-nav-border px-4 py-3 lg:hidden">
              {NAV.map(([label, href]) => (
                <Ext key={label} href={href} className="block border-b border-skyward-nav-border py-3 text-base font-medium last:border-0">
                  {label}
                </Ext>
              ))}
              <div className="grid grid-cols-2 gap-3 pt-3 sm:hidden">
                <Ext href="https://skyward.iscorp.com/" className="flex items-center justify-center border border-skyward-on-dark px-3 py-3 font-semibold">Log in</Ext>
                <Ext href={`${SITE}/get-started`} className="flex items-center justify-center bg-skyward-action px-3 py-3 font-semibold text-skyward-action-foreground">Get started</Ext>
              </div>
            </nav>
          )}
        </div>
      </header>

      <main>
        <section className="relative isolate min-h-[calc(100dvh-8rem)] overflow-hidden">
          <img
            src={heroImage}
            alt="A teacher reading with a student in a bright classroom"
            width={1920}
            height={1080}
            fetchPriority="high"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-[62%_center]"
          />
          <div className="absolute inset-0 -z-10 bg-skyward-hero-overlay" />
          <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-[1440px] items-center px-6 py-14 lg:px-9">
            <div className="max-w-[640px] animate-fade-up text-skyward-on-dark">
              <h1 className="font-skyward-display text-[clamp(2.6rem,5vw,4.8rem)] font-bold leading-[1.05]">
                Less time on tasks.<br />More time for students.
              </h1>
              <p className="mt-7 max-w-[590px] text-xl font-semibold leading-[1.35] sm:text-2xl">
                You can&apos;t squeeze any more hours into the school day, but you can find ways to complete essential administrative tasks with super speed.
              </p>
              <Ext
                href="https://www.youtube.com/@SkywardInc"
                className="mt-14 inline-flex items-center gap-3 border-2 border-skyward-on-dark px-6 py-3 text-xl font-medium transition-colors hover:bg-skyward-on-dark hover:text-skyward-deep"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-skyward-on-dark text-skyward-deep">
                  <Play className="ml-0.5 h-4 w-4 fill-current" />
                </span>
                Watch the story
              </Ext>
            </div>
          </div>
        </section>

        <section className="bg-skyward-surface px-6 py-16 text-center">
          <h2 className="font-skyward-display text-3xl font-bold text-skyward-deep sm:text-4xl">A better experience awaits</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-skyward-muted">
            Student information and business management tools built to help school districts work smarter and serve families better.
          </p>
          <Ext href={`${SITE}/products`} className="mt-8 inline-flex items-center gap-2 bg-skyward-deep px-7 py-3.5 font-semibold text-skyward-on-dark transition-colors hover:bg-skyward-deep-hover">
            Explore Skyward products <ArrowRight className="h-5 w-5" />
          </Ext>
        </section>
      </main>

      <footer className="bg-skyward-deep px-6 py-10 text-skyward-on-dark">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-8 sm:flex-row sm:items-center">
          <Ext href={SITE} ariaLabel="Skyward home"><Wordmark compact /></Ext>
          <div className="flex items-center gap-3">
            {([
              [Facebook, "https://www.facebook.com/SkywardInc", "Facebook"],
              [Twitter, "https://twitter.com/SkywardInc", "Twitter"],
              [Linkedin, "https://www.linkedin.com/company/skyward-inc", "LinkedIn"],
              [Youtube, "https://www.youtube.com/@SkywardInc", "YouTube"],
            ] as const).map(([Icon, href, label]) => (
              <Ext key={label} href={href} ariaLabel={label} className="flex h-10 w-10 items-center justify-center border border-skyward-footer-border transition-colors hover:bg-skyward-deep-hover">
                <Icon className="h-4 w-4" />
              </Ext>
            ))}
          </div>
        </div>
      </footer>

      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-skyward-surface text-skyward-ink">
          <div className="flex h-20 items-center justify-between bg-skyward-deep px-6 lg:px-10">
            <Wordmark compact />
            <Button type="button" variant="ghost" size="icon" aria-label="Close search" onClick={() => setSearchOpen(false)} className="text-skyward-on-dark hover:bg-skyward-deep-hover hover:text-skyward-on-dark">
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="mx-auto mt-16 max-w-3xl px-6">
            <p className="font-semibold uppercase text-skyward-nav">Search skyward.com</p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitSearch();
              }}
              className="mt-5 flex items-center gap-4 border-b-4 border-skyward-deep pb-4"
            >
              <Search className="h-8 w-8 shrink-0 text-skyward-deep" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                aria-label="Search skyward.com"
                placeholder="How can we help?"
                className="w-full bg-transparent text-3xl font-light outline-none placeholder:text-skyward-placeholder sm:text-4xl"
              />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}