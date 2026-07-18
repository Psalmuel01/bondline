"use client";

import { useEffect, useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import {
  FACTORY_ADDRESS,
  VAULT_ADDRESS,
  factoryAbi,
  podAbi,
  vaultAbi,
  Status,
  type Commitment,
  type Pod,
  type Proposal,
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

/// All pods from the factory registry, with each clone's name/threshold/
/// members/balance batched in a single multicall. No indexer needed.
export function usePods() {
  const { data: podAddrs, refetch: refetchAddrs } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "allPods",
  });

  const addrs = (podAddrs ?? []) as `0x${string}`[];

  const calls = addrs.flatMap((address) => [
    { address, abi: podAbi, functionName: "name" as const },
    { address, abi: podAbi, functionName: "approvalThresholdBps" as const },
    { address, abi: podAbi, functionName: "members" as const },
    { address, abi: podAbi, functionName: "balance" as const },
  ]);

  const { data, isLoading, refetch } = useReadContracts({
    contracts: calls,
    query: { enabled: addrs.length > 0 },
  });

  const pods: Pod[] = addrs.map((address, i) => {
    const base = i * 4;
    return {
      address,
      name: (data?.[base]?.result as string) ?? "",
      approvalThresholdBps: Number(data?.[base + 1]?.result ?? 0),
      members: ((data?.[base + 2]?.result as `0x${string}`[]) ?? []),
      balance: (data?.[base + 3]?.result as bigint) ?? 0n,
    };
  });

  const refresh = () => {
    refetchAddrs();
    refetch();
  };

  return { pods, isLoading, refresh };
}

/// A single pod's full detail (used by the pod page).
export function usePod(address?: `0x${string}`) {
  const enabled = !!address;
  const { data, isLoading, refetch } = useReadContracts({
    contracts: enabled
      ? [
          { address, abi: podAbi, functionName: "name" },
          { address, abi: podAbi, functionName: "approvalThresholdBps" },
          { address, abi: podAbi, functionName: "members" },
          { address, abi: podAbi, functionName: "balance" },
        ]
      : [],
    query: { enabled },
  });

  const pod: Pod | undefined =
    enabled && data
      ? {
          address,
          name: (data[0]?.result as string) ?? "",
          approvalThresholdBps: Number(data[1]?.result ?? 0),
          members: ((data[2]?.result as `0x${string}`[]) ?? []),
          balance: (data[3]?.result as bigint) ?? 0n,
        }
      : undefined;

  return { pod, isLoading, refresh: refetch };
}

/// All withdrawal proposals across all pods. Same fan-out pattern as
/// commitments; callers filter by pod.
export function useProposals() {
  const { data: count, refetch: refetchCount } = useReadContract({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "proposalCount",
  });

  const n = count ? Number(count) : 0;
  const contracts = Array.from({ length: n }, (_, i) => ({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "proposals" as const,
    args: [BigInt(i)] as const,
  }));

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: { enabled: n > 0 },
  });

  const proposals: Proposal[] = (data ?? [])
    .map((r, i) => {
      if (r.status !== "success" || !r.result) return null;
      const t = r.result as unknown as [
        `0x${string}`,
        `0x${string}`,
        bigint,
        boolean,
        number,
        string,
      ];
      return {
        id: BigInt(i),
        pod: t[0],
        to: t[1],
        amount: t[2],
        executed: t[3],
        approvals: Number(t[4]),
        memo: t[5],
      } satisfies Proposal;
    })
    .filter((p): p is Proposal => p !== null);

  const refresh = () => {
    refetchCount();
    refetch();
  };

  return { proposals, isLoading, refresh };
}

/// All commitments across all pods. Reads commitmentCount then fans out one
/// read per id. Callers filter by pod client-side.
export function useCommitments() {
  const { data: count, refetch: refetchCount } = useReadContract({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "commitmentCount",
  });

  const n = count ? Number(count) : 0;
  const contracts = Array.from({ length: n }, (_, i) => ({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "commitments" as const,
    args: [BigInt(i)] as const,
  }));

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: { enabled: n > 0 },
  });

  const commitments: Commitment[] = (data ?? [])
    .map((r, i) => {
      if (r.status !== "success" || !r.result) return null;
      const t = r.result as unknown as [
        `0x${string}`,
        `0x${string}`,
        bigint,
        bigint,
        bigint,
        number,
        number,
        number,
        string,
        `0x${string}`,
        string,
      ];
      return {
        id: BigInt(i),
        creator: t[0],
        pod: t[1],
        stake: t[2],
        deadline: t[3],
        voteClosesAt: t[4],
        status: t[5] as Status,
        yesVotes: Number(t[6]),
        noVotes: Number(t[7]),
        description: t[8],
        evidenceHash: t[9],
        evidenceUri: t[10],
      } satisfies Commitment;
    })
    .filter((c): c is Commitment => c !== null);

  const refresh = () => {
    refetchCount();
    refetch();
  };

  return { commitments, count: n, isLoading, refresh };
}
