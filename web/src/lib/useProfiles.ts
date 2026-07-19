"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfiles, isSupabaseConfigured, saveProfile, type ProfileRow } from "./supabase";

export function useProfiles(addresses: readonly string[]) {
  const key = useMemo(() => [...addresses].map((address) => address.toLowerCase()).sort().join(","), [addresses]);
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["profiles", key],
    queryFn: () => getProfiles(key.split(",")),
    enabled: isSupabaseConfigured && Boolean(key),
  });
  const profiles = Object.fromEntries(rows.map((row) => [row.address.toLowerCase(), row]));

  async function save(address: string, profile: { displayName: string; avatarUrl?: string; avatarColor: string }) {
    await saveProfile(address, profile);
    const next: ProfileRow = { address: address.toLowerCase(), display_name: profile.displayName.trim(), avatar_url: profile.avatarUrl?.trim() || null, avatar_color: profile.avatarColor, updated_at: new Date().toISOString() };
    queryClient.setQueryData<ProfileRow[]>(["profiles", key], (current = []) => [
      ...current.filter((row) => row.address.toLowerCase() !== next.address),
      next,
    ]);
  }

  const names = Object.fromEntries(Object.entries(profiles).map(([address, profile]) => [address, profile.display_name]));
  return { profiles, names, save, enabled: isSupabaseConfigured, isLoading };
}
