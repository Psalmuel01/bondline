"use client";

import { useEffect, useMemo, useState } from "react";
import { getProfiles, isSupabaseConfigured, saveProfile } from "./supabase";

export function useProfiles(addresses: readonly string[]) {
  const key = useMemo(() => [...addresses].map((address) => address.toLowerCase()).sort().join(","), [addresses]);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isSupabaseConfigured || !key) return;
    let cancelled = false;
    getProfiles(key.split(",")).then((rows) => {
      if (!cancelled) setNames(Object.fromEntries(rows.map((row) => [row.address.toLowerCase(), row.display_name])));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [key]);

  async function rename(address: string, displayName: string) {
    await saveProfile(address, displayName);
    setNames((previous) => ({ ...previous, [address.toLowerCase()]: displayName.trim() }));
  }

  return { names, rename, enabled: isSupabaseConfigured };
}
