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
      <div className="rounded-xl border border-gone/30 bg-gone/5 p-6 text-sm text-gone">
        Contracts aren&apos;t configured yet. Set NEXT_PUBLIC_FACTORY_ADDRESS and
        NEXT_PUBLIC_VAULT_ADDRESS in web/.env.local after deploying.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
          Your pods
        </h2>
        <button
          onClick={() => setCreating((v) => !v)}
          className="rounded-md border border-live/50 bg-live/10 px-3 py-1.5 text-sm font-medium text-live transition hover:bg-live/20"
        >
          {creating ? "Close" : "+ New pod"}
        </button>
      </div>

      {creating && <CreatePod onCreated={refreshAll} />}

      {isLoading && pods.length === 0 ? (
        <p className="text-sm text-faint">Loading pods…</p>
      ) : mine.length === 0 && !creating ? (
        <div className="rounded-xl border border-line bg-panel p-6">
          <p className="text-sm text-muted">
            You&apos;re not in a pod yet. Spin one up with your crew to start staking.
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
          <h2 className="text-sm font-semibold uppercase tracking-widest text-faint">
            Other pods
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
