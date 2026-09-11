import { useState } from "react";
import { Switch } from "@/components/ui/switch";

const KEYS = [
  ["AC", "+/-", "%", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  ["0", ".", "="],
];

const UNLOCK_CODE = "4923";

export function Calculator({ onUnlock }: { onUnlock: () => void }) {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);
  const [codeMode, setCodeMode] = useState(false);

  const apply = (a: number, b: number, o: string) => {
    switch (o) {
      case "+": return a + b;
      case "−": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? 0 : a / b;
      default: return b;
    }
  };

  const handle = (k: string) => {
    // Code mode: check unlock on every digit press
    if (codeMode && /[0-9]/.test(k)) {
      const next = fresh || display === "0" ? k : display + k;
      if (next.endsWith(UNLOCK_CODE)) {
        onUnlock();
        return;
      }
    }

    if (/[0-9]/.test(k)) {
      setDisplay((d) => (fresh || d === "0" ? k : d + k));
      setFresh(false);
      return;
    }
    if (k === ".") {
      setDisplay((d) => (fresh ? "0." : d.includes(".") ? d : d + "."));
      setFresh(false);
      return;
    }
    if (k === "AC") {
      setDisplay("0"); setPrev(null); setOp(null); setFresh(true); return;
    }
    if (k === "+/-") {
      setDisplay((d) => (d.startsWith("-") ? d.slice(1) : d === "0" ? d : "-" + d));
      return;
    }
    if (k === "%") {
      setDisplay((d) => String(parseFloat(d) / 100));
      return;
    }
    if (["+", "−", "×", "÷"].includes(k)) {
      const cur = parseFloat(display);
      if (prev !== null && op && !fresh) {
        const r = apply(prev, cur, op);
        setPrev(r); setDisplay(String(r));
      } else {
        setPrev(cur);
      }
      setOp(k); setFresh(true); return;
    }
    if (k === "=") {
      if (prev !== null && op) {
        const r = apply(prev, parseFloat(display), op);
        setDisplay(String(r)); setPrev(null); setOp(null); setFresh(true);
      }
      return;
    }
  };

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-black p-4">
      <div className="w-full max-w-xs">
        <div className="mb-3 flex items-center justify-between px-1 text-xs text-white/60">
          <span>Code mode</span>
          <Switch checked={codeMode} onCheckedChange={setCodeMode} />
        </div>
        <div className="mb-3 min-h-[96px] rounded-2xl bg-neutral-900 px-4 py-6 text-right text-5xl font-light text-white tabular-nums overflow-hidden">
          {display}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {KEYS.flat().map((k, i) => {
            const isOp = ["÷", "×", "−", "+", "="].includes(k);
            const isTop = ["AC", "+/-", "%"].includes(k);
            const wide = k === "0";
            return (
              <button
                key={i}
                onClick={() => handle(k)}
                className={[
                  "h-16 rounded-full text-2xl font-medium transition active:scale-95",
                  wide ? "col-span-2 text-left pl-7" : "",
                  isOp ? "bg-orange-500 text-white hover:bg-orange-400"
                    : isTop ? "bg-neutral-400 text-black hover:bg-neutral-300"
                    : "bg-neutral-700 text-white hover:bg-neutral-600",
                ].join(" ")}
              >
                {k}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
