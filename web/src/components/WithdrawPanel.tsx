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
        The Pot&apos;s empty. Crossed Bonds collect here for the Circle to spend.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-5">
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-semibold uppercase tracking-widest text-bone">
          Spend the Pot
        </span>
        <span className="tnum text-xs text-faint">
          needs {required} of {pod.members.length} to cosign
        </span>
      </div>

      <input
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="Recipient address (vendor, member, split contract)"
        className="tnum rounded-md border border-line bg-bg px-3 py-2 text-sm text-bone outline-none focus:border-gold/50"
      />
      <div className="flex gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal"
          placeholder={`Amount (max ${formatMon(pod.balance)})`}
          className="tnum flex-1 rounded-md border border-line bg-bg px-3 py-2 text-sm text-bone outline-none focus:border-gold/50"
        />
      </div>
      <input
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="What for? (group dinner, trip, refund)"
        className="rounded-md border border-line bg-bg px-3 py-2 text-sm text-bone outline-none focus:border-gold/50"
      />

      <button
        onClick={() => write.proposeWithdrawal(pod.address, to as `0x${string}`, amount, memo.trim())}
        disabled={!canSubmit || busy}
        className="w-full rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-ink transition hover:brightness-108 disabled:opacity-40"
      >
        {busy ? "Proposing…" : "Propose a payout"}
      </button>

      {!isMember && address && (
        <p className="text-xs text-faint">Only members of this Circle can propose.</p>
      )}
      {write.error && <p className="text-xs text-forfeit">{write.error}</p>}
      {write.hash && (
        <a
          href={explorerTx(write.hash)}
          target="_blank"
          rel="noreferrer"
          className="tnum text-xs text-gold underline decoration-dotted underline-offset-2"
        >
          {write.isConfirming ? "proposal pending ↗" : "proposal submitted ↗"}
        </a>
      )}
    </div>
  );
}
