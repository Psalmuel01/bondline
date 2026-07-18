"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { usePods, useCommitments } from "@/lib/hooks";
import { isConfigured } from "@/lib/contracts";
import { PodCard } from "./PodCard";
import { CreatePod } from "./CreatePod";

/// Multi-group dashboard: every pod you're in, plus a toggle to spin up a new
/// one. Pods you're not a member of are shown dimmed under "other pods" so the
/// registry is visible without cluttering your crews.
export function Dashboard() {
  const { address } = useAccount();
  const { pods, isLoading, refresh } = usePods();
  const { commitments, refresh: refreshCommitments } = useCommitments();
  const [creating, setCreating] = useState(false);

  const { mine, others } = useMemo(() => {
    const mine = [];
    const others = [];
    for (const p of pods) {
      if (address && p.members.some((m) => m.toLowerCase() === address.toLowerCase())) {
        mine.push(p);
      } else {
        others.push(p);
      }
    }
    return { mine, others };
  }, [pods, address]);

  function refreshAll() {
    refresh();
    refreshCommitments();
    setCreating(false);
  }

  if (!isConfigured) {
    return (
      <div className="rounded-xl border border-forfeit/30 bg-forfeit/5 p-6 text-sm text-forfeit">
        Contracts aren&apos;t configured yet. Set NEXT_PUBLIC_FACTORY_ADDRESS and
        NEXT_PUBLIC_VAULT_ADDRESS in web/.env.local after deploying.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold tracking-tight text-bone">
          Your Circles
        </h2>
        <button
          onClick={() => setCreating((v) => !v)}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-108"
        >
          {creating ? "Close" : "+ New Circle"}
        </button>
      </div>

      {creating && <CreatePod onCreated={refreshAll} />}

      {isLoading && pods.length === 0 ? (
        <p className="text-sm text-faint">Loading Circles…</p>
      ) : mine.length === 0 && !creating ? (
        <div className="rounded-xl border border-line bg-panel p-6">
          <p className="text-sm text-muted">
            You&apos;re not in a Circle yet. Start one with your crew and put a
            deadline on the Line.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((p) => (
            <PodCard key={p.address} pod={p} commitments={commitments} />
          ))}
        </div>
      )}

      {others.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-faint">
            Other Circles
          </h2>
          <div className="grid gap-4 opacity-60 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((p) => (
              <PodCard key={p.address} pod={p} commitments={commitments} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
