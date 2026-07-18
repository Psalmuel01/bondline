"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { usePod, useCommitments, useProposals, useNow } from "@/lib/hooks";
import { Status } from "@/lib/contracts";
import { bpsPct, formatMon, shortAddr } from "@/lib/format";
import { explorerAddr } from "@/lib/chain";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Avatar } from "./Avatar";
import { CommitmentCard } from "./CommitmentCard";
import { CreateCommitment } from "./CreateCommitment";
import { WithdrawPanel } from "./WithdrawPanel";
import { ProposalList } from "./ProposalList";

/// Full detail for one pod: pooled balance, member roster, the shared-fund
/// controls, and every commitment tied to this pod, live-sorted so the ones
/// needing attention float up.
export function PodDetail({ address: podAddress }: { address: `0x${string}` }) {
  const { address } = useAccount();
  const now = useNow();
  const { pod, isLoading, refresh } = usePod(podAddress);
  const { commitments, refresh: refreshCommitments } = useCommitments();
  const { proposals, refresh: refreshProposals } = useProposals();

  function refreshAll() {
    refresh();
    refreshCommitments();
    refreshProposals();
  }

  const podCommitments = commitments
    .filter((c) => c.pod.toLowerCase() === podAddress.toLowerCase())
    .sort((a, b) => {
      // voting first, then active by soonest deadline, then resolved
      const rank = (s: Status) =>
        s === Status.PendingVote ? 0 : s === Status.Active ? 1 : 2;
      const r = rank(a.status) - rank(b.status);
      if (r !== 0) return r;
      return Number(a.deadline - b.deadline);
    });

  const podProposals = proposals.filter(
    (p) => p.pod.toLowerCase() === podAddress.toLowerCase(),
  );

  const isMember =
    !!address && !!pod?.members.some((m) => m.toLowerCase() === address.toLowerCase());

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-6 sm:px-8">
      <Header />

      <Link href="/" className="mt-6 text-xs text-faint hover:text-muted">
        ← all Circles
      </Link>

      {isLoading && !pod ? (
        <p className="mt-8 text-sm text-faint">Loading Circle…</p>
      ) : !pod ? (
        <p className="mt-8 text-sm text-forfeit">Circle not found.</p>
      ) : (
        <>
          {/* pod header */}
          <section className="mt-4 flex flex-col gap-5 border-b border-line pb-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-tight text-bone">
                  {pod.name || "Untitled Circle"}
                </h1>
                <a
                  href={explorerAddr(pod.address)}
                  target="_blank"
                  rel="noreferrer"
                  className="tnum text-xs text-faint hover:text-muted"
                >
                  {shortAddr(pod.address)} ↗
                </a>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-faint">
                  The Pot
                </div>
                <div className="tnum text-3xl font-semibold text-gold">
                  {formatMon(pod.balance)}
                  <span className="ml-1 text-base text-muted">MON</span>
                </div>
              </div>
            </div>

            {/* roster */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-widest text-faint">
                {pod.members.length} members · {bpsPct(pod.approvalThresholdBps)} to cosign
              </span>
              <div className="flex flex-wrap gap-3">
                {pod.members.map((m) => (
                  <div key={m} className="flex items-center gap-1.5">
                    <Avatar
                      addr={m}
                      size={30}
                      you={m.toLowerCase() === address?.toLowerCase()}
                    />
                    <span className="tnum text-xs text-muted">
                      {shortAddr(m)}
                      {m.toLowerCase() === address?.toLowerCase() && " (you)"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
            {/* commitments */}
            <div className="flex flex-col gap-4">
              <h2 className="font-display text-lg font-semibold tracking-tight text-bone">
                Bonds on the Line
              </h2>
              {podCommitments.length === 0 ? (
                <div className="rounded-xl border border-line bg-panel p-6 text-sm text-faint">
                  No Bonds yet. Be the first to put money on the Line.
                </div>
              ) : (
                podCommitments.map((c) => (
                  <CommitmentCard
                    key={c.id.toString()}
                    c={c}
                    pod={pod}
                    now={now}
                    onResolved={refreshAll}
                  />
                ))
              )}
            </div>

            {/* right rail: create + spend */}
            <div className="flex flex-col gap-6">
              {isMember ? (
                <CreateCommitment pod={pod} onCreated={refreshAll} />
              ) : (
                <div className="rounded-xl border border-line bg-panel p-5 text-xs text-faint">
                  You&apos;re not in this Circle, so you can watch but not stake.
                </div>
              )}
              <WithdrawPanel pod={pod} onDone={refreshAll} />
              <ProposalList pod={pod} proposals={podProposals} onChange={refreshAll} />
            </div>
          </div>
        </>
      )}

      <Footer />
    </div>
  );
}
