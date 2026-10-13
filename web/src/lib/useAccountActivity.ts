"use client";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { monadMainnet } from "./chain";
import type { Circle } from "./contracts";
import type { ChainActivityRow } from "./snapshots";
export function useAccountActivity(circles: Circle[]) {
  const { address } = useAccount();
  const keys = circles
    .filter((c) =>
      c.members.some((m) => m.toLowerCase() === address?.toLowerCase()),
    )
    .map((c) => c.address.toLowerCase())
    .sort()
    .slice(0, 50)
    .join(",");
  return useQuery({
    queryKey: [
      "account-activity",
      monadMainnet.id,
      address?.toLowerCase(),
      keys,
    ],
    queryFn: async () => {
      const res = await fetch(`/api/activity?circles=${keys}`);
      if (!res.ok) throw new Error("Activity could not be loaded.");
      return res.json() as Promise<ChainActivityRow[]>;
    },
    enabled: !!address && !!keys,
    refetchInterval: 30_000,
  });
}
