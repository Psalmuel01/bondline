"use client";

import { useEffect, useState } from "react";
import { useAccount, useWatchContractEvent } from "wagmi";
import {
  CORE_ADDRESS,
  coreAbi,
  type Bond,
  type Circle,
} from "@/lib/contracts";
import { requiredForBond } from "@/lib/threshold";
import { useBondlineWrite } from "@/lib/useBondlineWrite";
import { shortAddr } from "@/lib/format";
import { explorerTx } from "@/lib/chain";
import { Avatar } from "./Avatar";

type Vote = "yes" | "no" | "pending";

/// Live voting UI for a Bond in PendingCosign. Seeds each member's vote
/// state from chain reads, then flips avatars green/red in real time as Cosigned
/// logs arrive — no refresh needed. Shows a running tally against the bar.
export function CosignPanel({
  b,
  circle,
  onResolved,
}: {
  b: Bond;
  circle: Circle;
  onResolved: () => void;
}) {
  const { address } = useAccount();
  const write = useBondlineWrite(onResolved);

  // voter address -> how they voted, kept live via event watching
  const [votes, setVotes] = useState<Record<string, Vote>>({});
  const [yes, setYes] = useState(b.cosigns);
  const [no, setNo] = useState(b.objections);

  // reset when the Bond identity changes
  useEffect(() => {
    setVotes({});
    setYes(b.cosigns);
    setNo(b.objections);
  }, [b.id, b.cosigns, b.objections]);

  // watch Cosigned events (approvals only)
  useWatchContractEvent({
    address: CORE_ADDRESS,
    abi: coreAbi,
    eventName: "Cosigned",
    onLogs(logs) {
      let touched = false;
      for (const log of logs) {
        const a = log.args as { id?: bigint; cosigner?: `0x${string}`; cosigns?: number };
        if (a.id !== b.id || !a.cosigner) continue;
        touched = true;
        setVotes((prev) => ({ ...prev, [a.cosigner!.toLowerCase()]: "yes" }));
        if (a.cosigns !== undefined) setYes(Number(a.cosigns));
      }
      if (touched) onResolved();
    },
  });

  // watch Objected events (objections only)
  useWatchContractEvent({
    address: CORE_ADDRESS,
    abi: coreAbi,
    eventName: "Objected",
    onLogs(logs) {
      let touched = false;
      for (const log of logs) {
        const a = log.args as { id?: bigint; objector?: `0x${string}`; objections?: number };
        if (a.id !== b.id || !a.objector) continue;
        touched = true;
        setVotes((prev) => ({ ...prev, [a.objector!.toLowerCase()]: "no" }));
        if (a.objections !== undefined) setNo(Number(a.objections));
      }
      if (touched) onResolved();
    },
  });

  const required = requiredForBond(circle.members.length, circle.cosignThresholdBps);
  const voters = circle.members.filter(
    (m) => m.toLowerCase() !== b.creator.toLowerCase(),
  );
  const isVoter =
    !!address &&
    address.toLowerCase() !== b.creator.toLowerCase() &&
    circle.members.some((m) => m.toLowerCase() === address.toLowerCase());
  const alreadyVoted = !!address && votes[address.toLowerCase()] !== undefined;
  const busy = write.isPending || write.isConfirming;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gold/30 bg-gold/5 p-4">
      <div className="flex items-center justify-between">
        <span className="font-display text-xs font-semibold uppercase tracking-widest text-gold">
          Circle is cosigning
        </span>
        <span className="tnum text-xs text-muted">
          {yes} of {required} needed · {no} against
        </span>
      </div>

      {/* tally bar */}
      <div className="flex h-2 overflow-hidden rounded-full bg-bg">
        <div
          className="bg-done transition-all duration-500"
          style={{ width: `${Math.min((yes / required) * 100, 100)}%` }}
        />
        <div
          className="bg-gone transition-all duration-500"
          style={{ width: `${Math.min((no / Math.max(voters.length, 1)) * 100, 100)}%` }}
        />
      </div>

      {/* member faces lighting up as votes land */}
      <div className="flex flex-wrap items-center gap-2">
        {voters.map((m) => {
          const v = votes[m.toLowerCase()] ?? "pending";
          return (
            <Avatar
              key={m}
              addr={m}
              vote={v}
              you={!!address && m.toLowerCase() === address.toLowerCase()}
              title={`${shortAddr(m)} — ${v === "pending" ? "hasn't voted" : v === "yes" ? "confirmed" : "rejected"}`}
            />
          );
        })}
      </div>

      {/* receipts */}
      {b.receiptsUri && (
        <a
          href={b.receiptsUri}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-gold underline decoration-dotted underline-offset-2"
        >
          Check the Receipts ↗
        </a>
      )}

      {/* voter actions */}
      {isVoter && !alreadyVoted && (
        <div className="flex gap-2">
          <button
            onClick={() => write.cosign(b.id)}
            disabled={busy}
            className="flex-1 rounded-md border border-confirm/50 bg-confirm/10 px-3 py-2 text-sm font-medium text-confirm transition hover:bg-confirm/20 disabled:opacity-50"
          >
            {busy ? "Confirming…" : "Cosign — they shipped"}
          </button>
          <button
            onClick={() => write.object(b.id)}
            disabled={busy}
            className="flex-1 rounded-md border border-forfeit/50 bg-forfeit/10 px-3 py-2 text-sm font-medium text-forfeit transition hover:bg-forfeit/20 disabled:opacity-50"
          >
            {busy ? "Confirming…" : "They didn't"}
          </button>
        </div>
      )}
      {isVoter && alreadyVoted && (
        <p className="text-xs text-faint">You&apos;ve cosigned. Waiting on the rest of the Circle.</p>
      )}
      {!isVoter && address?.toLowerCase() === b.creator.toLowerCase() && (
        <p className="text-xs text-faint">Your Bond is up. The Circle decides from here.</p>
      )}

      {write.error && <p className="text-xs text-forfeit">{write.error}</p>}
      {write.hash && (
        <a
          href={explorerTx(write.hash)}
          target="_blank"
          rel="noreferrer"
          className="tnum text-xs text-gold underline decoration-dotted underline-offset-2"
        >
          {write.isConfirming ? "cosign pending ↗" : "cosign confirmed ↗"}
        </a>
      )}
    </div>
  );
}
