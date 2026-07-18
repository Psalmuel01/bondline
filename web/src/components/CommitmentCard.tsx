"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { keccak256, toBytes } from "viem";
import { type Commitment, type Pod, Status } from "@/lib/contracts";
import { countdownParts, formatMon, shortAddr } from "@/lib/format";
import { explorerAddr, explorerTx } from "@/lib/chain";
import { useBondlineWrite } from "@/lib/useBondlineWrite";
import { VotePanel } from "./VotePanel";

const STATUS_META: Record<Status, { label: string; cls: string; dot: string }> = {
  [Status.Active]: { label: "LIVE", cls: "text-live border-live/40 bg-live/10", dot: "bg-live" },
  [Status.PendingVote]: {
    label: "VOTING",
    cls: "text-live border-live/40 bg-live/10",
    dot: "bg-live",
  },
  [Status.Completed]: { label: "REFUNDED", cls: "text-done border-done/40 bg-done/10", dot: "bg-done" },
  [Status.Forfeited]: { label: "FORFEITED", cls: "text-gone border-gone/40 bg-gone/10", dot: "bg-gone" },
};

export function CommitmentCard({
  c,
  pod,
  now,
  onResolved,
}: {
  c: Commitment;
  pod: Pod;
  now: number;
  onResolved: () => void;
}) {
  const { address } = useAccount();
  const write = useBondlineWrite(onResolved);
  const [declaring, setDeclaring] = useState(false);
  const [evidenceUri, setEvidenceUri] = useState("");

  const meta = STATUS_META[c.status];
  const cd = countdownParts(c.deadline, now);
  const voteCd = countdownParts(c.voteClosesAt, now);
  const isCreator = address?.toLowerCase() === c.creator.toLowerCase();

  const active = c.status === Status.Active;
  const pending = c.status === Status.PendingVote;
  const expired = active && cd.expired;

  const canDeclare = active && !cd.expired && isCreator;
  const canResolveExpired = pending && voteCd.expired;

  const busy = write.isPending || write.isConfirming;

  async function submitDeclare() {
    const hash = evidenceUri ? keccak256(toBytes(evidenceUri)) : ("0x" + "0".repeat(64) as `0x${string}`);
    await write.declareComplete(c.id, hash, evidenceUri.trim());
    setDeclaring(false);
  }

  return (
    <div
      className={`group relative flex flex-col gap-4 rounded-xl border bg-panel p-5 transition ${
        expired ? "border-gone/40" : pending ? "border-live/40" : "border-line hover:border-panel-hi"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`tnum inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wider ${meta.cls}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} ${active || pending ? "pulse" : ""}`} />
          {expired ? "DEADLINE PASSED" : meta.label}
        </span>
        <span className="tnum text-xs text-faint">#{c.id.toString().padStart(3, "0")}</span>
      </div>

      <p className="text-[15px] leading-snug text-text">{c.description}</p>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-faint">
            {pending ? "Vote closes in" : active ? (expired ? "Overdue" : "Time left") : "Resolved"}
          </div>
          <div
            className={`tnum text-2xl font-semibold ${
              c.status === Status.Completed
                ? "text-done"
                : c.status === Status.Forfeited || expired
                  ? "text-gone"
                  : cd.urgent
                    ? "text-gone"
                    : "text-text"
            }`}
          >
            {pending ? voteCd.text : active ? cd.text : meta.label}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-faint">
            {c.status === Status.Completed
              ? "Refunded"
              : c.status === Status.Forfeited
                ? "To the pod"
                : "Stake"}
          </div>
          <div className="tnum text-2xl font-semibold text-text">
            {formatMon(c.stake)}
            <span className="ml-1 text-sm text-muted">MON</span>
          </div>
        </div>
      </div>

      <div className="tnum flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
        <span>
          <span className="text-faint">by </span>
          <a href={explorerAddr(c.creator)} target="_blank" rel="noreferrer" className="hover:text-text">
            {shortAddr(c.creator)}
          </a>
          {isCreator && <span className="text-faint"> (you)</span>}
        </span>
        {c.status === Status.Forfeited && <span className="text-gone">funded the pod</span>}
        {c.status === Status.Completed && <span className="text-done">shipped in time</span>}
      </div>

      {/* live voting */}
      {pending && !voteCd.expired && <VotePanel c={c} pod={pod} onResolved={onResolved} />}

      {/* creator: declare complete */}
      {canDeclare && !declaring && (
        <button
          onClick={() => setDeclaring(true)}
          className="w-full rounded-md border border-done/50 bg-done/10 px-3 py-2 text-sm font-medium text-done transition hover:bg-done/20"
        >
          I shipped it → open the vote
        </button>
      )}
      {canDeclare && declaring && (
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg p-3">
          <span className="text-xs uppercase tracking-widest text-faint">Evidence link</span>
          <input
            value={evidenceUri}
            onChange={(e) => setEvidenceUri(e.target.value)}
            placeholder="https://… (PR, demo, screenshot)"
            className="rounded-md border border-line bg-panel px-3 py-2 text-sm text-text outline-none focus:border-live/50"
          />
          <span className="text-xs text-faint">
            Hashed on-chain so it can&apos;t be swapped after the fact. Your crew opens it to vote.
          </span>
          <div className="flex gap-2">
            <button
              onClick={submitDeclare}
              disabled={busy}
              className="flex-1 rounded-md border border-done/50 bg-done/10 px-3 py-2 text-sm font-medium text-done transition hover:bg-done/20 disabled:opacity-50"
            >
              {busy ? "Confirming…" : "Open the vote"}
            </button>
            <button
              onClick={() => setDeclaring(false)}
              className="rounded-md border border-line px-3 py-2 text-sm text-muted transition hover:text-text"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* anyone: resolve a lapsed vote */}
      {canResolveExpired && (
        <button
          onClick={() => write.resolveExpired(c.id)}
          disabled={busy}
          className="w-full rounded-md border border-gone/50 bg-gone/10 px-3 py-2 text-sm font-medium text-gone transition hover:bg-gone/20 disabled:opacity-50"
        >
          {busy ? "Confirming…" : "Vote window closed → resolve"}
        </button>
      )}

      {/* creator missed the deadline without ever declaring — anyone can push
          the stake into the pod fund. */}
      {expired && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gone">
            Deadline passed with no completion claim. This stake forfeits to the pod.
          </p>
          <button
            onClick={() => write.forfeitMissed(c.id)}
            disabled={busy}
            className="w-full rounded-md border border-gone/50 bg-gone/10 px-3 py-2 text-sm font-medium text-gone transition hover:bg-gone/20 disabled:opacity-50"
          >
            {busy ? "Confirming…" : "Forfeit → send stake to the pod"}
          </button>
        </div>
      )}

      {write.error && <p className="text-xs text-gone">{write.error}</p>}
      {write.hash && (
        <a
          href={explorerTx(write.hash)}
          target="_blank"
          rel="noreferrer"
          className="tnum text-xs text-live underline decoration-dotted underline-offset-2"
        >
          {write.isConfirming ? "tx pending — view on explorer ↗" : "tx confirmed — view on explorer ↗"}
        </a>
      )}
    </div>
  );
}
