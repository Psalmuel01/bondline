"use client";
import { useBonds, useCircles } from "@/lib/hooks";
import { reliability } from "@/lib/reliability";
import { formatMon } from "@/lib/format";
import { useReadContracts } from "wagmi";
import { CORE_ADDRESS, coreAbi, hasV2 } from "@/lib/contracts";

import { useQuery } from "@tanstack/react-query";
export function ProductAnalytics() {
  const { bonds, isLoading, error } = useBonds();
  const {
    circles,
    error: circlesError,
    isLoading: circlesLoading,
  } = useCircles();
  const stats = reliability(bonds);
  const members = new Set(
    circles.flatMap((c) => c.members.map((m) => m.toLowerCase())),
  );
  const totals = useReadContracts({
    contracts: [
      {
        address: CORE_ADDRESS,
        abi: coreAbi,
        functionName: "totalSocialCosigns",
      },
      { address: CORE_ADDRESS, abi: coreAbi, functionName: "testerCount" },
    ],
    query: { enabled: hasV2, refetchInterval: 15000 },
  });
  const indexed = useQuery({
    queryKey: ["product-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics");
      if (!res.ok) throw new Error("Indexed analytics not available");
      return res.json() as Promise<{
        cosigns: number;
        uniqueCosigners: number;
        testers: number;
        transactions: number;
        circleJoins: number;
        source: string;
      }>;
    },
    refetchInterval: 30000,
  });
  return (
    <section className="my-8">
      <p className="text-xs uppercase tracking-widest text-gold">
        Live product data
      </p>
      <h1 className="font-display my-3 text-3xl font-semibold tracking-tight text-bone">
        Progress across Bondline.
      </h1>
      <p className="mb-6 text-sm text-muted">
        Public contract records and indexed events. These totals describe
        account activity, not a count of unique people.
      </p>
      {isLoading && <p className="text-sm text-muted">Loading live state…</p>}
      {error && <p className="text-forfeit">Unable to fetch live state.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Member accounts", members.size],
          ["Commitments", stats.total],
          ["Active / in review", stats.active],
          [
            "Completion rate",
            stats.percentage === null ? "—" : `${stats.percentage}%`,
          ],
          ["Completed", stats.completed],
          ["Missed", stats.failed],
          ["Total committed", `${formatMon(stats.totalStake)} MON`],
          [
            "Circle Pots",
            `${formatMon(circles.reduce((sum, c) => sum + c.balance, 0n))} MON`,
          ],
          ["Circles", circles.length],
          ["Accepted Circle joins", indexed.data?.circleJoins ?? "—"],
          ["Opt-in tester accounts", totals.data?.[1]?.result?.toString() ?? indexed.data?.testers ?? "—"],
          [
            "Social backing",
            totals.data?.[0]?.result?.toString() ??
              indexed.data?.cosigns ??
              "—",
          ],
          ["Unique supporters", indexed.data?.uniqueCosigners ?? "—"],
          ["Indexed transactions", indexed.data?.transactions ?? "—"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-line bg-panel p-5"
          >
            <p className="text-xs text-muted">{label}</p>
            <p className="tnum mt-2 text-2xl text-bone">
              {isLoading || circlesLoading || error || circlesError
                ? "—"
                : value}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-faint">
        Completion rate excludes unsettled commitments. Backing totals come
        directly from the contract. Unique supporters and transaction counts use
        the event indexer. An account count does not establish a number of real
        people. {indexed.data?.source}
      </p>
    </section>
  );
}
