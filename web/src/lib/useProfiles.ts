"use client";

import { useEffect, useMemo, useState } from "react";
import { getProfiles, isSupabaseConfigured, saveProfile, type ProfileRow } from "./supabase";

export function useProfiles(addresses: readonly string[]) {
  const key = useMemo(() => [...addresses].map((address) => address.toLowerCase()).sort().join(","), [addresses]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});

  useEffect(() => {
    if (!isSupabaseConfigured || !key) return;
    let cancelled = false;
    getProfiles(key.split(",")).then((rows) => {
      if (!cancelled) setProfiles(Object.fromEntries(rows.map((row) => [row.address.toLowerCase(), row])));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [key]);

  async function save(address: string, profile: { displayName: string; avatarUrl?: string; avatarColor: string }) {
    await saveProfile(address, profile);
    setProfiles((previous) => ({ ...previous, [address.toLowerCase()]: { address: address.toLowerCase(), display_name: profile.displayName.trim(), avatar_url: profile.avatarUrl?.trim() || null, avatar_color: profile.avatarColor, updated_at: new Date().toISOString() } }));
  }

  const names = Object.fromEntries(Object.entries(profiles).map(([address, profile]) => [address, profile.display_name]));
  return { profiles, names, save, enabled: isSupabaseConfigured };
}
