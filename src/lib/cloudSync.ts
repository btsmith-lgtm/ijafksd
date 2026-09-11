import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Bookmark, HistoryEntry, Settings } from "@/lib/store";

export type CloudState = {
  settings: Partial<Settings>;
  bookmarks: Bookmark[];
  history: HistoryEntry[];
};

/** Read the signed-in account's saved settings/bookmarks/history. */
export async function loadCloudState(userId: string): Promise<CloudState | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("settings, bookmarks, history")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("Couldn't load saved settings:", error.message);
    return null;
  }
  if (!data) return null;
  return {
    settings: (data.settings ?? {}) as Partial<Settings>,
    bookmarks: (data.bookmarks ?? []) as Bookmark[],
    history: (data.history ?? []) as HistoryEntry[],
  };
}

export async function saveCloudState(userId: string, state: CloudState) {
  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: userId,
      settings: state.settings as never,
      bookmarks: state.bookmarks as never,
      history: state.history as never,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) console.error("Couldn't save settings:", error.message);
}

/**
 * Keeps the account's settings/bookmarks/history saved in the cloud.
 * Waits until the first load has been applied so we never overwrite
 * saved data with defaults.
 */
export function useCloudSettingsSync(
  userId: string | null,
  ready: boolean,
  state: CloudState,
) {
  const latest = useRef(state);
  latest.current = state;

  useEffect(() => {
    if (!userId || !ready) return;
    const timer = window.setTimeout(() => {
      void saveCloudState(userId, latest.current);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [userId, ready, state]);
}
