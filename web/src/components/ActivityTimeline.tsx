"use client";

import { useState } from "react";
import type { Bond } from "@/lib/contracts";
import { Status } from "@/lib/contracts";
import { explorerAddr, explorerTx } from "@/lib/chain";
import { formatMon, shortAddr } from "@/lib/format";
import type { Activity } from "@/lib/supabase";

function when(date: string | number) {
  return new Date(date).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ActivityTimeline({
  bonds,
  names,
  snapshotEvents = [],
  compact = false,
}: {
  bonds: Bond[];
  names: Record<string, string>;
  snapshotEvents?: Activity[];
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const events = [...snapshotEvents].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
  const fallback = [...bonds]
    .reverse()
    .slice(0, 8)
    .map((bond) => {
      const person =
        names[bond.creator.toLowerCase()] || shortAddr(bond.creator);
      const state =
        bond.status === Status.Met
          ? "completed a commitment"
          : bond.status === Status.Crossed
            ? "settled a missed commitment"
            : bond.status === Status.PendingCosign
              ? "submitted evidence for review"
              : "created a commitment";
      const timestamp =
        bond.status === Status.PendingCosign
          ? Number(bond.cosignClosesAt - 86_400n) * 1000
          : Number(bond.deadline) * 1000;
      return {
        id: bond.id.toString(),
        person,
        address: bond.creator,
        body: `${state} · ${formatMon(bond.stake)} MON`,
        timestamp,
      };
    });
  const count = events.length || fallback.length;
  const limit = compact && !expanded ? 3 : count;
  return (
    <section className="rounded-xl border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h2 className="font-display text-base font-semibold text-bone">
            {events.length ? "Recent activity" : "Commitment summaries"}
          </h2>
          {!compact && (
            <p className="mt-0.5 text-xs text-faint">
              {events.length
                ? "Recorded on-chain events."
                : "Current recorded states; times below are deadlines, not settlement times."}
            </p>
          )}
        </div>
        {!compact && (
          <span className="tnum text-[10px] uppercase tracking-widest text-faint">
            Timeline
          </span>
        )}
      </div>
      <div className="divide-y divide-line">
        {events.length > 0 ? (
          events.slice(0, limit).map((event) => (
            <div key={event.id} className="flex gap-2.5 px-4 py-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-6 text-bone">{event.body}</p>
                <p className="mt-1 text-xs text-faint">
                  {when(event.created_at)}
                  {event.actor_address && (
                    <>
                      {" "}
                      ·{" "}
                      <a
                        className="underline decoration-line underline-offset-2 hover:text-gold"
                        href={explorerAddr(event.actor_address)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {names[event.actor_address.toLowerCase()] ||
                          shortAddr(event.actor_address)}
                      </a>
                    </>
                  )}
                  {event.tx_hash && (
                    <>
                      {" "}
                      ·{" "}
                      <a
                        className="text-gold hover:underline"
                        aria-label="View transaction on explorer"
                        title="View transaction on explorer"
                        href={explorerTx(event.tx_hash)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span aria-hidden="true">↗</span>
                      </a>
                    </>
                  )}
                </p>
              </div>
            </div>
          ))
        ) : fallback.length > 0 ? (
          fallback.slice(0, limit).map((event) => (
            <div key={event.id} className="flex gap-2.5 px-4 py-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-6 text-bone">
                  {event.person} {event.body}
                </p>
                <p className="mt-1 text-xs text-faint">
                  deadline / review window · {when(event.timestamp)} ·{" "}
                  <a
                    className="text-gold hover:underline"
                    href={explorerAddr(event.address)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    wallet ↗
                  </a>
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="px-5 py-9 text-center text-sm text-faint">
            Your Circle’s story will appear here: commitments, backing, evidence
            reviews, and outcomes. Start a goal or check in with your friends.
          </p>
        )}
      </div>
      {compact && count > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="w-full border-t border-line px-4 py-3 text-left text-xs text-gold hover:bg-panel-hi"
        >
          {expanded ? "Show less ↑" : `Show all ${count} updates ↓`}
        </button>
      )}
    </section>
  );
}
