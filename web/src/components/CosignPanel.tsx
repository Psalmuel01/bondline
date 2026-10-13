"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useReadContracts, useWatchContractEvent } from "wagmi";
import {
  CORE_ADDRESS,
  coreAbi,
  hasV2,
  type Bond,
  type Circle,
} from "@/lib/contracts";
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
  const resolution = useReadContract({ address: CORE_ADDRESS, abi: coreAbi, functionName: "cosignState", args: [b.id], query: { refetchInterval: 10000 } });
  const checks = useReadContracts({ contracts: circle.members.map((member) => ({ address: CORE_ADDRESS, abi: coreAbi, functionName: "hasResponded" as const, args: [b.id, member] as const })), query: { refetchInterval: 10000 } });
  const write = useBondlineWrite(() => { void checks.refetch(); onResolved(); });

  // voter address -> how they voted, kept live via event watching
  const [votes, setVotes] = useState<Record<string, Vote>>({});
  const [yes, setYes] = useState(b.cosigns);
  const [no, setNo] = useState(b.objections);

  // reset when the Bond identity changes
  useEffect(() => {
    setVotes({});
    setYes(b.cosigns);
    setNo(b.objections);
  }, [b.id]);
  useEffect(() => { setYes(b.cosigns); setNo(b.objections); }, [b.cosigns, b.objections]);

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

  const state = resolution.data;
  const required = Number(state?.[1] ?? 1);
  const eligibleMembers = hasV2 && state ? circle.members.slice(0, Number(state[0]) + 1) : circle.members;
  const voters = eligibleMembers.filter(
    (m) => m.toLowerCase() !== b.creator.toLowerCase(),
  );
  const isVoter =
    !!address &&
    address.toLowerCase() !== b.creator.toLowerCase() &&
    eligibleMembers.some((m) => m.toLowerCase() === address.toLowerCase());
  const myIndex = circle.members.findIndex((m) => m.toLowerCase() === address?.toLowerCase());
  const recordedResponse = myIndex >= 0 ? checks.data?.[myIndex]?.result : undefined;
  const myVote = address ? votes[address.toLowerCase()] : undefined;
  const alreadyVoted = recordedResponse === true || myVote === "yes" || myVote === "no";
  const busy = write.isPending || write.isConfirming;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gold/30 bg-gold/5 p-4">
      <div className="flex items-center justify-between">
        <span className="font-display text-xs font-semibold uppercase tracking-widest text-gold">
          Review evidence
        </span>
        <span className="tnum text-xs text-muted">
          {yes} of {required} approvals · {no} disputes
        </span>
      </div>

      <p className="text-xs leading-relaxed text-muted">Backing expressed confidence before completion. This review checks the evidence and decides whether the stake is returned or goes to the Pot.</p>

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
          const index = circle.members.findIndex((member) => member.toLowerCase() === m.toLowerCase());
          const reviewed = checks.data?.[index]?.result === true;
          return (
            <Avatar
              key={m}
              addr={m}
              vote={v}
              you={!!address && m.toLowerCase() === address.toLowerCase()}
              title={`${shortAddr(m)} — ${v === "pending" ? (reviewed ? "reviewed evidence" : "has not reviewed evidence") : v === "yes" ? "confirmed" : "rejected"}`}
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
          View evidence ↗
        </a>
      )}

      {/* voter actions */}
      {isVoter && !alreadyVoted && (
        <div className="flex gap-2">
          <button
            onClick={() => write.cosign(b.id)}
            disabled={busy || !state || recordedResponse === undefined}
            className="flex-1 rounded-md border border-confirm/50 bg-confirm/10 px-3 py-2 text-sm font-medium text-confirm transition hover:bg-confirm/20 disabled:opacity-50"
          >
            {busy ? "Confirming…" : "Approve evidence"}
          </button>
          <button
            onClick={() => write.object(b.id)}
            disabled={busy || !state || recordedResponse === undefined}
            className="flex-1 rounded-md border border-forfeit/50 bg-forfeit/10 px-3 py-2 text-sm font-medium text-forfeit transition hover:bg-forfeit/20 disabled:opacity-50"
          >
            {busy ? "Confirming…" : "Dispute"}
          </button>
        </div>
      )}
      {isVoter && alreadyVoted && (
        <p className="text-xs text-faint">{myVote === "yes" ? "You approved the evidence." : myVote === "no" ? "You disputed the evidence." : "You already reviewed this evidence."} Waiting for the Circle&apos;s decision.</p>
      )}
      {!isVoter && address?.toLowerCase() === b.creator.toLowerCase() && (
        <p className="text-xs text-faint">Your evidence is ready. Your Circle reviews it; you cannot approve your own commitment.</p>
      )}

      {write.error && <p className="text-xs text-forfeit">{write.error}</p>}
      {write.hash && (
        <a
          href={explorerTx(write.hash)}
          target="_blank"
          rel="noreferrer"
          className="tnum text-xs text-gold underline decoration-dotted underline-offset-2"
        >
          {write.isConfirming ? "Review pending ↗" : "Review recorded ↗"}
        </a>
      )}
    </div>
  );
}
