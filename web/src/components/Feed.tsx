"use client";

import { useMemo, useState } from "react";
import { Status } from "@/lib/contract";
import { useCommitments, useNow } from "@/lib/useCommitments";
import { formatMon } from "@/lib/format";
import { CommitmentCard } from "./CommitmentCard";
import { CreateForm } from "./CreateForm";
import { VAULT_ADDRESS } from "@/lib/contract";

export function Feed() {
  const now = useNow();
  const { commitments, isLoading, refresh } = useCommitments();
  const [showCreate, setShowCreate] = useState(false);

  const notDeployed = VAULT_ADDRESS === "0x0000000000000000000000000000000000000000";

  const { active, resolved, stats } = useMemo(() => {
    const active = commitments
      .filter((c) => c.status === Status.Active)
      .sort((a, b) => Number(a.deadline - b.deadline));
    const resolved = commitments
      .filter((c) => c.status !== Status.Active)
      .sort((a, b) => Number(b.id - a.id));

    const totalStaked = commitments.reduce((s, c) => s + c.stake, 0n);
    const shipped = commitments.filter((c) => c.status === Status.Completed).length;
    const forfeited = commitments.filter((c) => c.status === Status.Forfeited).length;
    const resolvedCount = shipped + forfeited;
    const shipRate = resolvedCount > 0 ? Math.round((shipped / resolvedCount) * 100) : null;

    return {
      active,
      resolved,
      stats: { totalStaked, shipped, forfeited, shipRate, count: commitments.length },
    };
  }, [commitments]);

  return (
    <div className="flex flex-col gap-8">
      {/* stats bar */}
      <div className="tnum grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
        <Stat label="Commitments" value={stats.count.toString()} />
        <Stat label="Total staked" value={`${formatMon(stats.totalStaked)} MON`} />
        <Stat label="Shipped" value={stats.shipped.toString()} tone="done" />
        <Stat
          label="Ship rate"
          value={stats.shipRate === null ? "—" : `${stats.shipRate}%`}
          tone={stats.shipRate !== null && stats.shipRate < 50 ? "gone" : "done"}
        />
      </div>

      {/* create toggle */}
      <div>
        {showCreate ? (
          <CreateForm
            onCreated={() => {
              refresh();
            }}
          />
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full rounded-xl border border-dashed border-line py-4 text-sm text-muted transition hover:border-live/40 hover:text-live"
          >
            + Make a commitment
          </button>
        )}
      </div>

      {notDeployed && (
        <p className="rounded-md border border-gone/40 bg-gone/10 p-3 text-xs text-gone">
          No vault address configured. Set NEXT_PUBLIC_VAULT_ADDRESS in web/.env.local after deploying.
        </p>
      )}

      {/* active */}
      <section className="flex flex-col gap-4">
        <SectionHeader title="Live commitments" count={active.length} />
        {isLoading && active.length === 0 ? (
          <Skeleton />
        ) : active.length === 0 ? (
          <Empty text="Nothing on the line right now. Be the first to stake." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((c) => (
              <CommitmentCard key={c.id.toString()} c={c} now={now} onResolved={refresh} />
            ))}
          </div>
        )}
      </section>

      {/* resolved */}
      {resolved.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionHeader title="Resolved" count={resolved.length} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resolved.map((c) => (
              <CommitmentCard key={c.id.toString()} c={c} now={now} onResolved={refresh} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "done" | "gone" }) {
  const color = tone === "done" ? "text-done" : tone === "gone" ? "text-gone" : "text-text";
  return (
    <div className="bg-panel px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-faint">{label}</div>
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">{title}</h2>
      <span className="tnum text-xs text-faint">{count}</span>
      <div className="h-px flex-1 bg-line" />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line py-12 text-center text-sm text-faint">
      {text}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-52 animate-pulse rounded-xl border border-line bg-panel" />
      ))}
    </div>
  );
}
