"use client";

import { useAccount } from "wagmi";
import type { Pod, Proposal } from "@/lib/contracts";
import { useBondlineWrite } from "@/lib/useBondlineWrite";
import { requiredForWithdrawal } from "@/lib/threshold";
import { formatMon, shortAddr } from "@/lib/format";
import { explorerAddr } from "@/lib/chain";

/// Pending + settled withdrawal proposals for a pod, each with an approve
/// button that executes automatically once the bar is cleared on-chain.
export function ProposalList({
  pod,
  proposals,
  onChange,
}: {
  pod: Pod;
  proposals: Proposal[];
  onChange: () => void;
}) {
  const { address } = useAccount();
  const write = useBondlineWrite(onChange);
  const required = requiredForWithdrawal(pod.members.length, pod.approvalThresholdBps);
  const isMember =
    !!address && pod.members.some((m) => m.toLowerCase() === address.toLowerCase());
  const busy = write.isPending || write.isConfirming;

  if (proposals.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">
        Withdrawal proposals
      </h3>
      {proposals.map((p) => (
        <div
          key={p.id.toString()}
          className={`flex flex-col gap-2 rounded-lg border bg-panel p-4 ${
            p.executed ? "border-done/30" : "border-line"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-text">{p.memo}</span>
            <span className="tnum text-sm font-semibold text-text">
              {formatMon(p.amount)} MON
            </span>
          </div>
          <div className="tnum flex items-center justify-between text-xs text-muted">
            <span>
              to{" "}
              <a
                href={explorerAddr(p.to)}
                target="_blank"
                rel="noreferrer"
                className="hover:text-text"
              >
                {shortAddr(p.to)}
              </a>
            </span>
            {p.executed ? (
              <span className="text-done">paid out</span>
            ) : (
              <span>
                {p.approvals} of {required} approvals
              </span>
            )}
          </div>
          {!p.executed && isMember && (
            <button
              onClick={() => write.approveWithdrawal(p.id)}
              disabled={busy}
              className="rounded-md border border-live/50 bg-live/10 px-3 py-1.5 text-sm font-medium text-live transition hover:bg-live/20 disabled:opacity-40"
            >
              {busy ? "Confirming…" : "Approve"}
            </button>
          )}
        </div>
      ))}
      {write.error && <p className="text-xs text-gone">{write.error}</p>}
    </div>
  );
}
