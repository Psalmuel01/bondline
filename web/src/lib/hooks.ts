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
  const { data: circleAddrs, isLoading: addressesLoading, error: addressesError, refetch: refetchAddrs } = useReadContract({
    address: CIRCLE_FACTORY_ADDRESS,
    abi: circleFactoryAbi,
    functionName: "allCircles",
  });
  const addrs = (circleAddrs ?? []) as `0x${string}`[];
  const calls = addrs.flatMap((address) => [
    { address, abi: circleAbi, functionName: "name" as const },
    { address, abi: circleAbi, functionName: "cosignThresholdBps" as const },
    { address, abi: circleAbi, functionName: "members" as const },
    { address, abi: circleAbi, functionName: "balance" as const },
  ]);
  const { data, isLoading, error, refetch } = useReadContracts({ contracts: calls, query: { enabled: addrs.length > 0, staleTime: 60_000, gcTime: 30 * 60_000 } });
  const circles = addrs.map((address, i) => {
    const base = i * 4;
    return { address, name: (data?.[base]?.result as string) ?? "", cosignThresholdBps: Number(data?.[base + 1]?.result ?? 0), members: (data?.[base + 2]?.result as `0x${string}`[]) ?? [], balance: (data?.[base + 3]?.result as bigint) ?? 0n } satisfies Circle;
  });
  return { circles, isLoading: addressesLoading || isLoading, error: addressesError ?? error, refresh: () => { refetchAddrs(); refetch(); } };
}

export function useCircle(address?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContracts({
    contracts: address ? [{ address, abi: circleAbi, functionName: "name" }, { address, abi: circleAbi, functionName: "cosignThresholdBps" }, { address, abi: circleAbi, functionName: "members" }, { address, abi: circleAbi, functionName: "balance" }] : [],
    query: { enabled: !!address, staleTime: 60_000, gcTime: 30 * 60_000 },
  });
  const circle = address && data ? { address, name: (data[0]?.result as string) ?? "", cosignThresholdBps: Number(data[1]?.result ?? 0), members: (data[2]?.result as `0x${string}`[]) ?? [], balance: (data[3]?.result as bigint) ?? 0n } satisfies Circle : undefined;
  return { circle, isLoading, refresh: refetch };
}

export function usePayouts() {
  const { data: count, isLoading: countLoading, refetch: refetchCount } = useReadContract({ address: CORE_ADDRESS, abi: coreAbi, functionName: "payoutCount" });
  const calls = Array.from({ length: Number(count ?? 0) }, (_, i) => ({ address: CORE_ADDRESS, abi: coreAbi, functionName: "payouts" as const, args: [BigInt(i)] as const }));
  const { data, isLoading, refetch } = useReadContracts({ contracts: calls, query: { enabled: calls.length > 0, staleTime: 60_000, gcTime: 30 * 60_000 } });
  const payouts = (data ?? []).flatMap((entry, i) => { if (entry.status !== "success" || !entry.result) return []; const t = entry.result as unknown as [`0x${string}`, `0x${string}`, bigint, boolean, number, string]; return [{ id: BigInt(i), circle: t[0], to: t[1], amount: t[2], executed: t[3], cosigns: Number(t[4]), memo: t[5] } satisfies Payout]; });
  return { payouts, isLoading: countLoading || isLoading, refresh: () => { refetchCount(); refetch(); } };
}

export function useBonds() {
  const { data: count, isLoading: countLoading, refetch: refetchCount } = useReadContract({ address: CORE_ADDRESS, abi: coreAbi, functionName: "bondCount" });
  const calls = Array.from({ length: Number(count ?? 0) }, (_, i) => ({ address: CORE_ADDRESS, abi: coreAbi, functionName: "bonds" as const, args: [BigInt(i)] as const }));
  const { data, isLoading, refetch } = useReadContracts({ contracts: calls, query: { enabled: calls.length > 0, staleTime: 60_000, gcTime: 30 * 60_000 } });
  const bonds = (data ?? []).flatMap((entry, i) => { if (entry.status !== "success" || !entry.result) return []; const t = entry.result as unknown as [`0x${string}`, `0x${string}`, bigint, bigint, bigint, number, number, number, string, `0x${string}`, string]; return [{ id: BigInt(i), creator: t[0], circle: t[1], stake: t[2], deadline: t[3], cosignClosesAt: t[4], status: t[5] as Status, cosigns: Number(t[6]), objections: Number(t[7]), description: t[8], receiptsHash: t[9], receiptsUri: t[10] } satisfies Bond]; });
  return { bonds, count: Number(count ?? 0), isLoading: countLoading || isLoading, refresh: () => { refetchCount(); refetch(); } };
}
