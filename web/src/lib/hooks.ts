"use client";

import { useEffect, useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import {
  CIRCLE_FACTORY_ADDRESS,
  CORE_ADDRESS,
  circleFactoryAbi,
  circleAbi,
  coreAbi,
  Status,
  type Bond,
  type Circle,
  type Payout,
} from "./contracts";
import { useCircleSnapshot, useDashboardSnapshot } from "./useSnapshots";

/// Shared 1s ticker so every countdown on the page updates in lockstep.
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function useCircles() {
  const snapshot = useDashboardSnapshot();
  const { data: circleAddrs, isLoading: addressesLoading, error: addressesError, refetch: refetchAddrs } = useReadContract({
    address: CIRCLE_FACTORY_ADDRESS,
    abi: circleFactoryAbi,
    functionName: "allCircles",
    query: { refetchInterval: 30_000 },
  });
  const addrs = (circleAddrs ?? []) as `0x${string}`[];
  const calls = addrs.flatMap((address) => [
    { address, abi: circleAbi, functionName: "name" as const },
    { address, abi: circleAbi, functionName: "cosignThresholdBps" as const },
    { address, abi: circleAbi, functionName: "members" as const },
    { address, abi: circleAbi, functionName: "balance" as const },
  ]);
  const { data, isLoading, error, refetch } = useReadContracts({ contracts: calls, query: { enabled: addrs.length > 0, staleTime: 60_000, gcTime: 30 * 60_000, refetchInterval: 30_000 } });
  const liveCircles = addrs.map((address, i) => {
    const base = i * 4;
    return { address, name: (data?.[base]?.result as string) ?? "", cosignThresholdBps: Number(data?.[base + 1]?.result ?? 0), members: (data?.[base + 2]?.result as `0x${string}`[]) ?? [], balance: (data?.[base + 3]?.result as bigint) ?? 0n } satisfies Circle;
  });
  const liveComplete = circleAddrs !== undefined && (calls.length === 0 || (!isLoading && data?.length === calls.length && data.every((entry) => entry.status === "success")));
  // These registries are append-only. Never let a partial/lagging RPC response
  // replace a known-good indexed snapshot with fewer entities.
  const liveReady = liveComplete && liveCircles.length >= (snapshot.data?.circles.length ?? 0);
  const circles = liveReady ? liveCircles : (snapshot.data?.circles ?? []);
  return {
    circles,
    isLoading: !liveReady && !snapshot.data && (addressesLoading || isLoading || snapshot.isLoading),
    error: !snapshot.data ? (addressesError ?? error ?? snapshot.error) : undefined,
    refresh: () => { void snapshot.refetch(); void refetchAddrs(); void refetch(); },
  };
}

export function useCircle(address?: `0x${string}`) {
  const snapshot = useCircleSnapshot(address);
  const { data, isLoading, refetch } = useReadContracts({
    contracts: address ? [{ address, abi: circleAbi, functionName: "name" }, { address, abi: circleAbi, functionName: "cosignThresholdBps" }, { address, abi: circleAbi, functionName: "members" }, { address, abi: circleAbi, functionName: "balance" }] : [],
    query: { enabled: !!address, staleTime: 60_000, gcTime: 30 * 60_000 },
  });
  const liveComplete = Boolean(address && !isLoading && data?.length === 4 && data.every((entry) => entry.status === "success"));
  const liveMemberCount = (data?.[2]?.result as readonly string[] | undefined)?.length ?? 0;
  const liveReady = liveComplete && liveMemberCount >= (snapshot.data?.circle.members.length ?? 0);
  const liveCircle = address && liveReady ? { address, name: (data?.[0]?.result as string) ?? "", cosignThresholdBps: Number(data?.[1]?.result ?? 0), members: (data?.[2]?.result as `0x${string}`[]) ?? [], balance: (data?.[3]?.result as bigint) ?? 0n } satisfies Circle : undefined;
  return {
    circle: liveCircle ?? snapshot.data?.circle,
    isLoading: !liveCircle && !snapshot.data && (isLoading || snapshot.isLoading),
    refresh: () => { void snapshot.refetch(); void refetch(); },
  };
}

export function usePayouts() {
  const snapshot = useDashboardSnapshot();
  const { data: count, isLoading: countLoading, refetch: refetchCount } = useReadContract({ address: CORE_ADDRESS, abi: coreAbi, functionName: "payoutCount" });
  const calls = Array.from({ length: Number(count ?? 0) }, (_, i) => ({ address: CORE_ADDRESS, abi: coreAbi, functionName: "payouts" as const, args: [BigInt(i)] as const }));
  const { data, isLoading, refetch } = useReadContracts({ contracts: calls, query: { enabled: calls.length > 0, staleTime: 60_000, gcTime: 30 * 60_000 } });
  const livePayouts = (data ?? []).flatMap((entry, i) => { if (entry.status !== "success" || !entry.result) return []; const t = entry.result as unknown as [`0x${string}`, `0x${string}`, bigint, boolean, number, string]; return [{ id: BigInt(i), circle: t[0], to: t[1], amount: t[2], executed: t[3], cosigns: Number(t[4]), memo: t[5] } satisfies Payout]; });
  const liveComplete = count !== undefined && (calls.length === 0 || (!isLoading && data?.length === calls.length && data.every((entry) => entry.status === "success")));
  const liveReady = liveComplete && Number(count ?? 0) >= (snapshot.data?.payouts.length ?? 0);
  return {
    payouts: liveReady ? livePayouts : (snapshot.data?.payouts ?? []),
    isLoading: !liveReady && !snapshot.data && (countLoading || isLoading || snapshot.isLoading),
    refresh: () => { void snapshot.refetch(); void refetchCount(); void refetch(); },
  };
}

export function useBonds() {
  const snapshot = useDashboardSnapshot();
  const { data: count, isLoading: countLoading, refetch: refetchCount } = useReadContract({ address: CORE_ADDRESS, abi: coreAbi, functionName: "bondCount", query: { refetchInterval: 30_000 } });
  const calls = Array.from({ length: Number(count ?? 0) }, (_, i) => ({ address: CORE_ADDRESS, abi: coreAbi, functionName: "bonds" as const, args: [BigInt(i)] as const }));
  const { data, isLoading, refetch } = useReadContracts({ contracts: calls, query: { enabled: calls.length > 0, staleTime: 60_000, gcTime: 30 * 60_000, refetchInterval: 30_000 } });
  const liveBonds = (data ?? []).flatMap((entry, i) => { if (entry.status !== "success" || !entry.result) return []; const t = entry.result as unknown as [`0x${string}`, `0x${string}`, bigint, bigint, bigint, number, number, number, string, `0x${string}`, string]; return [{ id: BigInt(i), creator: t[0], circle: t[1], stake: t[2], deadline: t[3], cosignClosesAt: t[4], status: t[5] as Status, cosigns: Number(t[6]), objections: Number(t[7]), description: t[8], receiptsHash: t[9], receiptsUri: t[10] } satisfies Bond]; });
  const liveComplete = count !== undefined && (calls.length === 0 || (!isLoading && data?.length === calls.length && data.every((entry) => entry.status === "success")));
  const liveReady = liveComplete && Number(count ?? 0) >= (snapshot.data?.bonds.length ?? 0);
  const bonds = liveReady ? liveBonds : (snapshot.data?.bonds ?? []);
  return {
    bonds,
    count: liveReady ? Number(count ?? 0) : bonds.length,
    isLoading: !liveReady && !snapshot.data && (countLoading || isLoading || snapshot.isLoading),
    refresh: () => { void snapshot.refetch(); void refetchCount(); void refetch(); },
  };
}
