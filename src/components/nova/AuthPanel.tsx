import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const emailFor = (username: string) =>
  `${username.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}@nova.chat`;

async function ensureProfile(userId: string, username: string) {
  const { data, error: selectError } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", userId)
    .maybeSingle();

  if (selectError) {
    console.warn("[nova] couldn't check profile:", selectError.message);
  }

  if (data?.id) return data as { id: string; username: string };

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({ id: userId, username })
    .select("id, username")
    .single();

  if (insertError) {
    console.warn("[nova] couldn't create profile:", insertError.message);
    return null;
  }

  return inserted as { id: string; username: string };
}

/** Username + password sign in. Used to gate the OS and inside chat. */
export function AuthPanel({
  title,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const name = username.trim();
      if (name.length < 3) {
        toast.error("Pick a name with at least 3 characters");
        return;
      }
      const email = emailFor(name);
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: name } },
        });
        if (error) throw error;

        // Auto-confirm is enabled, so the user should be signed in immediately.
        // Create their public profile so chat usernames work.
        if (data.user) {
          await ensureProfile(data.user.id, name);
        }
        if (!data.session) {
          toast.success("Account created — sign in to continue");
          setMode("signin");
          return;
        }
        toast.success("Account created — you're signed in");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          await ensureProfile(data.user.id, name);
        }
        toast.success("Welcome back");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-dvh items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="glass w-full max-w-sm rounded-2xl p-6"
        style={{ borderRadius: "var(--radius)" }}
      >
        <h1 className="text-xl font-semibold tracking-tight">
          {mode === "signin" ? (title ?? "Sign in to chat") : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin"
            ? (subtitle ?? "Just your username and password.")
            : "Pick a name others can DM you by."}
        </p>

        <div className="mt-5 space-y-3">
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            className="w-full rounded-lg bg-white/[0.05] px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-primary"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="w-full rounded-lg bg-white/[0.05] px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-primary"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "No account? Sign up" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
