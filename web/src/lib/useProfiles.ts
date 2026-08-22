"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfiles, isSupabaseConfigured, saveProfile, type ProfileRow } from "./supabase";
import type { CircleSnapshot } from "./snapshots";

export function useProfiles(addresses: readonly string[], initialRows?: ProfileRow[]) {
  const key = useMemo(() => [...addresses].map((address) => address.toLowerCase()).sort().join(","), [addresses]);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["profiles", key],
    queryFn: () => getProfiles(key.split(",")),
    enabled: isSupabaseConfigured && Boolean(key),
    initialData: initialRows,
  });
  const rows = query.data ?? initialRows ?? [];
  const isLoading = query.isLoading && !initialRows;
  const profiles = Object.fromEntries(rows.map((row) => [row.address.toLowerCase(), row]));

  async function save(address: string, profile: { displayName: string; avatarUrl?: string; avatarColor: string }) {
    await saveProfile(address, profile);
    const next: ProfileRow = { address: address.toLowerCase(), display_name: profile.displayName.trim(), avatar_url: profile.avatarUrl?.trim() || null, avatar_color: profile.avatarColor, updated_at: new Date().toISOString() };
    queryClient.setQueryData<ProfileRow[]>(["profiles", key], (current = []) => [
      ...current.filter((row) => row.address.toLowerCase() !== next.address),
      next,
    ]);
    queryClient.setQueriesData<CircleSnapshot>({ queryKey: ["indexed-circle-snapshot"] }, (current) => current ? {
      ...current,
      profiles: [...current.profiles.filter((row) => row.address.toLowerCase() !== next.address), next],
    } : current);
  }

  const names = Object.fromEntries(Object.entries(profiles).map(([address, profile]) => [address, profile.display_name]));
  return { profiles, names, save, enabled: isSupabaseConfigured, isLoading };
}
