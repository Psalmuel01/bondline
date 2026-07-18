"use client";

import { useState } from "react";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import type { Pod } from "@/lib/contracts";
import { useBondlineWrite } from "@/lib/useBondlineWrite";
import { requiredForWithdrawal } from "@/lib/threshold";
import { formatMon } from "@/lib/format";
import { explorerTx } from "@/lib/chain";

/// Propose a group withdrawal from the pod's pooled balance. Same threshold as
/// commitments, but over the full membership. A full proposal list / approval
/// board would layer on top of proposeWithdrawal + approveWithdrawal; this
/// covers the propose step and states the bar.
export function WithdrawPanel({ pod, onDone }: { pod: Pod; onDone: () => void }) {
  const { address } = useAccount();
  const write = useBondlineWrite(onDone);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  const isMember =
    !!address && pod.members.some((m) => m.toLowerCase() === address.toLowerCase());
  const required = requiredForWithdrawal(pod.members.length, pod.approvalThresholdBps);
  const amountNum = Number(amount);
  const canSubmit =
    isMember &&
    isAddress(to) &&
    amountNum > 0 &&
    memo.trim().length > 0 &&
    pod.balance > 0n;
  const busy = write.isPending || write.isConfirming;

  if (pod.balance === 0n) {
    return (
      <div className="rounded-xl border border-line bg-panel p-5 text-xs text-faint">
        Nothing pooled yet. Forfeited stakes collect here for the group to spend.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted">
          Spend the pool
        </span>
        <span className="tnum text-xs text-faint">
          needs {required} of {pod.members.length} to approve
        </span>
      </div>

      <input
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="Recipient address (vendor, member, split contract)"
        className="tnum rounded-md border border-line bg-bg px-3 py-2 text-sm text-text outline-none focus:border-live/50"
      />
      <div className="flex gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal"
          placeholder={`Amount (max ${formatMon(pod.balance)})`}
          className="tnum flex-1 rounded-md border border-line bg-bg px-3 py-2 text-sm text-text outline-none focus:border-live/50"
        />
      </div>
      <input
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="What for? (group dinner, charity, refund)"
        className="rounded-md border border-line bg-bg px-3 py-2 text-sm text-text outline-none focus:border-live/50"
      />

      <button
        onClick={() => write.proposeWithdrawal(pod.address, to as `0x${string}`, amount, memo.trim())}
        disabled={!canSubmit || busy}
        className="w-full rounded-md border border-live/50 bg-live/10 px-3 py-2 text-sm font-medium text-live transition hover:bg-live/20 disabled:opacity-40"
      >
        {busy ? "Proposing…" : "Propose withdrawal"}
      </button>

      {!isMember && address && (
        <p className="text-xs text-faint">Only members of this pod can propose.</p>
      )}
      {write.error && <p className="text-xs text-gone">{write.error}</p>}
      {write.hash && (
        <a
          href={explorerTx(write.hash)}
          target="_blank"
          rel="noreferrer"
          className="tnum text-xs text-live underline decoration-dotted underline-offset-2"
        >
          {write.isConfirming ? "proposal pending ↗" : "proposal submitted ↗"}
        </a>
      )}
    </div>
  );
}
