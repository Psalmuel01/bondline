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
      <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-muted">
        Payout proposals
      </h3>
      {proposals.map((p) => (
        <div
          key={p.id.toString()}
          className={`flex flex-col gap-2 rounded-lg border bg-panel p-4 ${
            p.executed ? "border-confirm/30" : "border-line"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-bone">{p.memo}</span>
            <span className="tnum text-sm font-semibold text-gold">
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
                className="hover:text-bone"
              >
                {shortAddr(p.to)}
              </a>
            </span>
            {p.executed ? (
              <span className="text-confirm">paid out</span>
            ) : (
              <span>
                {p.approvals} of {required} cosigns
              </span>
            )}
          </div>
          {!p.executed && isMember && (
            <button
              onClick={() => write.approveWithdrawal(p.id)}
              disabled={busy}
              className="rounded-md border border-confirm/50 bg-confirm/10 px-3 py-1.5 text-sm font-medium text-confirm transition hover:bg-confirm/20 disabled:opacity-40"
            >
              {busy ? "Confirming…" : "Cosign the payout"}
            </button>
          )}
        </div>
      ))}
      {write.error && <p className="text-xs text-forfeit">{write.error}</p>}
    </div>
  );
}
