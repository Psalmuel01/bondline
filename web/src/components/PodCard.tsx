"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import type { Commitment, Pod } from "@/lib/contracts";
import { Status } from "@/lib/contracts";
import { bpsPct, formatMon } from "@/lib/format";
import { Avatar } from "./Avatar";

/// One pod tile on the dashboard. Surfaces the numbers that matter at a glance:
/// pooled balance, live/voting count, and whether it's your turn to vote.
export function PodCard({
  pod,
  commitments,
}: {
  pod: Pod;
  commitments: Commitment[];
}) {
  const { address } = useAccount();
  const mine = commitments.filter((c) => c.pod.toLowerCase() === pod.address.toLowerCase());
  const live = mine.filter((c) => c.status === Status.Active).length;
  const voting = mine.filter((c) => c.status === Status.PendingVote);

  const needsYou =
    !!address &&
    voting.some(
      (c) =>
        c.creator.toLowerCase() !== address.toLowerCase() &&
        pod.members.some((m) => m.toLowerCase() === address.toLowerCase()),
    );

  return (
    <Link
      href={`/pod/${pod.address}`}
      className="group flex flex-col gap-4 rounded-xl border border-line bg-panel p-5 transition hover:border-panel-hi"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight text-bone">
            {pod.name || "Untitled Circle"}
          </h3>
          <p className="tnum mt-0.5 text-xs text-faint">
            {pod.members.length} members · {bpsPct(pod.approvalThresholdBps)} to cosign
          </p>
        </div>
        {needsYou && (
          <span className="tnum rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold pulse">
            COSIGN NOW
          </span>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-faint">The Pot</div>
          <div className="tnum text-2xl font-semibold text-bone">
            {formatMon(pod.balance)}
            <span className="ml-1 text-sm text-muted">MON</span>
          </div>
        </div>
        <div className="flex -space-x-2">
          {pod.members.slice(0, 5).map((m) => (
            <Avatar key={m} addr={m} size={26} />
          ))}
          {pod.members.length > 5 && (
            <div className="tnum flex h-[26px] w-[26px] items-center justify-center rounded-full border border-line bg-bg text-[10px] text-muted">
              +{pod.members.length - 5}
            </div>
          )}
        </div>
      </div>

      <div className="tnum flex gap-3 border-t border-line pt-3 text-xs text-muted">
        {live > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-gold pulse" />
            {live} on the Line
          </span>
        )}
        {voting.length > 0 && <span className="text-gold">{voting.length} in cosign</span>}
        {live === 0 && voting.length === 0 && <span className="text-faint">no live Bonds</span>}
      </div>
    </Link>
  );
}
