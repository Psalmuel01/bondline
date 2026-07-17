"use client";

import { useEffect, useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { VAULT_ADDRESS, vaultAbi, type Commitment, Status } from "./contract";

/// Shared 1s ticker so every countdown on the page updates in lockstep.
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/// Reads commitmentCount, then fans out one commitments(id) read per id.
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
      const [creator, witness, beneficiary, stake, deadline, status, description] =
        r.result as unknown as [
          `0x${string}`,
          `0x${string}`,
          `0x${string}`,
          bigint,
          bigint,
          number,
          string,
        ];
      return {
        id: BigInt(i),
        creator,
        witness,
        beneficiary,
        stake,
        deadline,
        status: status as Status,
        description,
      } satisfies Commitment;
    })
    .filter((c): c is Commitment => c !== null);

  const refresh = () => {
    refetchCount();
    refetch();
  };

  return { commitments, count: n, isLoading, refresh };
}
