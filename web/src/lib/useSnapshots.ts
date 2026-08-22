"use client";

import { useQuery } from "@tanstack/react-query";
import { circleSnapshotKey, dashboardSnapshotKey, getCircleSnapshot, getDashboardSnapshot } from "./snapshots";
import { isSupabaseConfigured } from "./supabase";

const SNAPSHOT_STALE_TIME = 60_000;

export function useDashboardSnapshot() {
  return useQuery({
    queryKey: dashboardSnapshotKey,
    queryFn: getDashboardSnapshot,
    enabled: isSupabaseConfigured,
    staleTime: SNAPSHOT_STALE_TIME,
    gcTime: 30 * 60_000,
    refetchInterval: 60_000,
  });
}

export function useCircleSnapshot(address?: `0x${string}`) {
  return useQuery({
    queryKey: circleSnapshotKey(address ?? ""),
    queryFn: () => getCircleSnapshot(address!),
    enabled: isSupabaseConfigured && Boolean(address),
    staleTime: SNAPSHOT_STALE_TIME,
    gcTime: 30 * 60_000,
    refetchInterval: 60_000,
  });
}
