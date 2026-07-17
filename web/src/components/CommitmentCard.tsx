"use client";

import { useAccount } from "wagmi";
import { type Commitment, Status } from "@/lib/contract";
import { countdownParts, formatMon, shortAddr } from "@/lib/format";
import { explorerAddr, explorerTx } from "@/lib/chain";
import { useVaultWrite } from "@/lib/useVaultWrite";

const STATUS_META: Record<Status, { label: string; cls: string; dot: string }> = {
  [Status.Active]: { label: "LIVE", cls: "text-live border-live/40 bg-live/10", dot: "bg-live" },
  [Status.Completed]: { label: "SHIPPED", cls: "text-done border-done/40 bg-done/10", dot: "bg-done" },
  [Status.Forfeited]: { label: "FORFEITED", cls: "text-gone border-gone/40 bg-gone/10", dot: "bg-gone" },
};

export function CommitmentCard({
  c,
  now,
  onResolved,
}: {
  c: Commitment;
  now: number;
  onResolved: () => void;
}) {
  const { address } = useAccount();
  const write = useVaultWrite(onResolved);

  const meta = STATUS_META[c.status];
  const cd = countdownParts(c.deadline, now);
  const active = c.status === Status.Active;
  const expired = active && cd.expired;

  const isWitness = address?.toLowerCase() === c.witness.toLowerCase();
  const canComplete = active && !cd.expired && isWitness;
  const canForfeit = active && cd.expired;

  const busy = write.isPending || write.isConfirming;

  return (
    <div
      className={`group relative flex flex-col gap-4 rounded-xl border bg-panel p-5 transition ${
        expired ? "border-gone/40" : "border-line hover:border-panel-hi"
      }`}
    >
      {/* status + id */}
      <div className="flex items-center justify-between">
        <span
          className={`tnum inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wider ${meta.cls}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} ${active ? "pulse" : ""}`} />
          {expired ? "DEADLINE PASSED" : meta.label}
        </span>
        <span className="tnum text-xs text-faint">#{c.id.toString().padStart(3, "0")}</span>
      </div>

      {/* the promise */}
      <p className="text-[15px] leading-snug text-text">{c.description}</p>

      {/* countdown — the emotional core */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-faint">
            {active ? (expired ? "Overdue" : "Time left") : "Resolved"}
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
            {active ? cd.text : meta.label}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-faint">
            {c.status === Status.Completed ? "Refunded" : c.status === Status.Forfeited ? "Forfeited" : "Stake"}
          </div>
          <div className="tnum text-2xl font-semibold text-text">
            {formatMon(c.stake)}
            <span className="ml-1 text-sm text-muted">MON</span>
          </div>
        </div>
      </div>

      {/* parties */}
      <div className="tnum grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs text-muted">
        <div>
          <span className="text-faint">by </span>
          <a href={explorerAddr(c.creator)} target="_blank" rel="noreferrer" className="hover:text-text">
            {shortAddr(c.creator)}
          </a>
        </div>
        <div className="text-right">
          <span className="text-faint">witness </span>
          <a href={explorerAddr(c.witness)} target="_blank" rel="noreferrer" className="hover:text-text">
            {shortAddr(c.witness)}
          </a>
        </div>
      </div>

      {/* action zone */}
      {(canComplete || canForfeit) && (
        <div className="flex flex-col gap-2">
          {canComplete && (
            <button
              onClick={() => write.markComplete(c.id)}
              disabled={busy}
              className="w-full rounded-md border border-done/50 bg-done/10 px-3 py-2 text-sm font-medium text-done transition hover:bg-done/20 disabled:opacity-50"
            >
              {busy ? "Confirming on-chain…" : "Vouch: they shipped → refund stake"}
            </button>
          )}
          {canForfeit && (
            <button
              onClick={() => write.claimForfeit(c.id)}
              disabled={busy}
              className="w-full rounded-md border border-gone/50 bg-gone/10 px-3 py-2 text-sm font-medium text-gone transition hover:bg-gone/20 disabled:opacity-50"
            >
              {busy ? "Confirming on-chain…" : "Claim forfeit → send stake to beneficiary"}
            </button>
          )}
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
          {write.isConfirming ? "tx pending — view on explorer" : "tx confirmed — view on explorer"} ↗
        </a>
      )}
    </div>
  );
}
