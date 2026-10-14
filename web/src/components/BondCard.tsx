"use client";

import { Avatar } from "./Avatar";
import { evidenceUrl } from "@/lib/evidence";
import { useState } from "react";
import { useAccount } from "wagmi";
import { keccak256, toBytes } from "viem";
import { type Bond, type Circle, Status } from "@/lib/contracts";
import { countdownParts, formatMon, shortAddr } from "@/lib/format";
import { explorerAddr, explorerTx } from "@/lib/chain";
import { useBondlineWrite } from "@/lib/useBondlineWrite";
import { CosignPanel } from "./CosignPanel";
import { CommitmentSignals, useVerification } from "./CommitmentSignals";
import { hasV2 } from "@/lib/contracts";
import { ReceiptPreview } from "./ReceiptPreview";

const STATUS_META: Record<Status, { label: string; cls: string; dot: string }> =
  {
    [Status.Active]: {
      label: "In progress",
      cls: "text-gold border-gold/40 bg-gold/10",
      dot: "bg-gold",
    },
    [Status.PendingCosign]: {
      label: "Evidence review",
      cls: "text-gold border-gold/40 bg-gold/10",
      dot: "bg-gold",
    },
    [Status.Met]: {
      label: "Completed",
      cls: "text-confirm border-confirm/40 bg-confirm/10",
      dot: "bg-confirm",
    },
    [Status.Crossed]: {
      label: "Missed",
      cls: "text-forfeit border-forfeit/40 bg-forfeit/10",
      dot: "bg-forfeit",
    },
  };

export function BondCard({
  b,
  circle,
  now,
  onResolved,
  creatorName,
}: {
  b: Bond;
  circle: Circle;
  now: number;
  onResolved: () => void;
  creatorName?: string;
}) {
  const { address } = useAccount();
  const write = useBondlineWrite(onResolved);
  const verification = useVerification(b.id);
  const [declaring, setDeclaring] = useState(false);
  const [evidenceUri, setEvidenceUri] = useState("");

  const meta = STATUS_META[b.status];
  const cd = countdownParts(b.deadline, now);
  const voteCd = countdownParts(b.cosignClosesAt, now);
  const isCreator = address?.toLowerCase() === b.creator.toLowerCase();

  const active = b.status === Status.Active;
  const pending = b.status === Status.PendingCosign;
  const expired = active && cd.expired;

  const canDeclare =
    active && !cd.expired && isCreator && (!hasV2 || verification?.[0] === 0);
  const canResolveExpired = pending && voteCd.expired;

  const busy = write.isPending || write.isConfirming;
  const receipt = evidenceUri.trim();
  const canOpenCosign = Boolean(evidenceUrl(receipt));

  async function submitDeclare() {
    if (!canOpenCosign) return;
    const hash = keccak256(toBytes(receipt));
    const submitted = await write.declareDone(b.id, hash, receipt);
    if (submitted) setDeclaring(false);
  }

  return (
    <div
      className={`motion-card group relative flex flex-col gap-5 rounded-2xl border bg-panel p-5 sm:p-6 transition ${
        expired ? "border-gone/40" : pending ? "border-live/40" : "border-line"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar addr={b.creator} size={36} />
          <div>
            <a
              href={explorerAddr(b.creator)}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium hover:text-gold"
            >
              {creatorName || shortAddr(b.creator)}
              {isCreator ? " · You" : ""}
            </a>
            <p className="mt-0.5 text-xs text-faint">
              Commitment #{b.id.toString()}
            </p>
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs ${meta.cls}`}>
          {expired ? "Needs settlement" : meta.label}
        </span>
      </div>
      <h3 className="font-display break-words text-xl font-medium leading-relaxed tracking-tight">
        {b.description}
      </h3>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-faint">
            {pending
              ? "Evidence review closes in"
              : active
                ? expired
                  ? "Overdue"
                  : "Time remaining"
                : "Outcome"}
          </div>
          <div
            className={`tnum text-xl font-semibold ${
              b.status === Status.Met
                ? "text-confirm"
                : b.status === Status.Crossed || expired
                  ? "text-forfeit"
                  : "text-gold"
            }`}
          >
            {pending ? voteCd.text : active ? cd.text : meta.label}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-faint">
            {b.status === Status.Met
              ? "Released stake"
              : b.status === Status.Crossed
                ? "Into the Pot"
                : "Stake"}
          </div>
          <div className="tnum text-xl font-semibold text-gold">
            {formatMon(b.stake)}
            <span className="ml-1 text-sm text-muted">MON</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted">
        Deadline:{" "}
        {new Date(Number(b.deadline) * 1000).toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>

      <CommitmentSignals bond={b} circle={circle} onChange={onResolved} />

      {/* live voting */}
      {pending && !voteCd.expired && (
        <CosignPanel b={b} circle={circle} onResolved={onResolved} />
      )}

      {b.receiptsUri && <ReceiptPreview uri={b.receiptsUri} />}

      {/* creator: declare complete */}
      {canDeclare && !declaring && (
        <button
          onClick={() => setDeclaring(true)}
          className="primary-button w-full"
        >
          Submit evidence
        </button>
      )}
      {canDeclare && declaring && (
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg p-3">
          <span className="text-xs uppercase tracking-widest text-faint">
            Link to your evidence
          </span>
          <input
            maxLength={2048}
            aria-label="Evidence link"
            value={evidenceUri}
            onChange={(e) => setEvidenceUri(e.target.value)}
            placeholder="https://… (PR, demo, screenshot)"
            className="rounded-md border border-line bg-panel px-3 py-2 text-sm text-bone outline-none focus:border-gold/50"
          />
          {receipt && !canOpenCosign && (
            <p role="alert" className="text-xs text-forfeit">
              Enter a complete HTTP or HTTPS link your reviewers can access.
            </p>
          )}
          <span className="text-xs text-faint">
            Share evidence of completion. Your Circle has 24 hours to review it.
            Earlier backing is encouragement; evidence approval decides the
            refund.
          </span>
          <div className="flex gap-2">
            <button
              onClick={submitDeclare}
              disabled={busy || !canOpenCosign}
              className="flex-1 rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-ink transition hover:brightness-108 disabled:opacity-50"
            >
              {busy ? "Confirming…" : "Submit for review"}
            </button>
            <button
              onClick={() => setDeclaring(false)}
              className="rounded-md border border-line px-3 py-2 text-sm text-muted transition hover:text-bone"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* anyone: resolve a lapsed cosign window */}
      {canResolveExpired && (
        <button
          onClick={() => write.resolveExpired(b.id)}
          disabled={busy}
          className="w-full rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium text-bone transition hover:border-panel-hi disabled:opacity-50"
        >
          {busy ? "Confirming…" : "Review window closed · Settle commitment"}
        </button>
      )}

      {/* creator crossed the Line without ever declaring — anyone can push
          the stake into the Pot. */}
      {expired && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-forfeit">
            No evidence was submitted before the deadline. Settle this
            commitment to move its stake into the Circle’s Pot.
          </p>
          <button
            onClick={() => write.crossMissed(b.id)}
            disabled={busy}
            className="w-full rounded-md border border-forfeit/50 bg-forfeit/10 px-3 py-2 text-sm font-medium text-forfeit transition hover:bg-forfeit/20 disabled:opacity-50"
          >
            {busy ? "Confirming…" : "Send the stake to the Pot"}
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
          {write.isConfirming
            ? "tx pending — view on explorer ↗"
            : write.isSuccess
              ? "Action confirmed — view on explorer ↗"
              : "View transaction ↗"}
        </a>
      )}
    </div>
  );
}
