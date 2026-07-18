"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useCircle, useBonds, usePayouts, useNow } from "@/lib/hooks";
import { Status } from "@/lib/contracts";
import { bpsPct, formatMon, shortAddr } from "@/lib/format";
import { explorerAddr } from "@/lib/chain";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Avatar } from "./Avatar";
import { BondCard } from "./BondCard";
import { OpenBond } from "./OpenBond";
import { PayoutPanel } from "./PayoutPanel";
import { PayoutList } from "./PayoutList";

/// Full detail for one Circle: pooled balance, member roster, the shared-fund
/// controls, and every Bond tied to this Circle, live-sorted so the ones
/// needing attention float up.
export function CircleDetail({ address: circleAddress }: { address: `0x${string}` }) {
  const { address } = useAccount();
  const now = useNow();
  const { circle, isLoading, refresh } = useCircle(circleAddress);
  const { bonds, refresh: refreshBonds } = useBonds();
  const { payouts, refresh: refreshPayouts } = usePayouts();

  function refreshAll() {
    refresh();
    refreshBonds();
    refreshPayouts();
  }

  const circleBonds = bonds
    .filter((b) => b.circle.toLowerCase() === circleAddress.toLowerCase())
    .sort((a, b) => {
      // voting first, then active by soonest deadline, then resolved
      const rank = (s: Status) =>
        s === Status.PendingCosign ? 0 : s === Status.Active ? 1 : 2;
      const r = rank(a.status) - rank(b.status);
      if (r !== 0) return r;
      return Number(a.deadline - b.deadline);
    });

  const circlePayouts = payouts.filter(
    (p) => p.circle.toLowerCase() === circleAddress.toLowerCase(),
  );

  const isMember =
    !!address && !!circle?.members.some((m) => m.toLowerCase() === address.toLowerCase());

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-6 sm:px-8">
      <Header />

      <Link href="/" className="mt-6 text-xs text-faint hover:text-muted">
        ← all Circles
      </Link>

      {isLoading && !circle ? (
        <p className="mt-8 text-sm text-faint">Loading Circle…</p>
      ) : !circle ? (
        <p className="mt-8 text-sm text-forfeit">Circle not found.</p>
      ) : (
        <>
          {/* circle header */}
          <section className="mt-4 flex flex-col gap-5 border-b border-line pb-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-tight text-bone">
                  {circle.name || "Untitled Circle"}
                </h1>
                <a
                  href={explorerAddr(circle.address)}
                  target="_blank"
                  rel="noreferrer"
                  className="tnum text-xs text-faint hover:text-muted"
                >
                  {shortAddr(circle.address)} ↗
                </a>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-faint">
                  The Pot
                </div>
                <div className="tnum text-3xl font-semibold text-gold">
                  {formatMon(circle.balance)}
                  <span className="ml-1 text-base text-muted">MON</span>
                </div>
              </div>
            </div>

            {/* roster */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-widest text-faint">
                {circle.members.length} members · {bpsPct(circle.cosignThresholdBps)} to cosign
              </span>
              <div className="flex flex-wrap gap-3">
                {circle.members.map((m) => (
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
            {/* bonds */}
            <div className="flex flex-col gap-4">
              <h2 className="font-display text-lg font-semibold tracking-tight text-bone">
                Bonds on the Line
              </h2>
              {circleBonds.length === 0 ? (
                <div className="rounded-xl border border-line bg-panel p-6 text-sm text-faint">
                  No Bonds yet. Be the first to put money on the Line.
                </div>
              ) : (
                circleBonds.map((b) => (
                  <BondCard
                    key={b.id.toString()}
                    b={b}
                    circle={circle}
                    now={now}
                    onResolved={refreshAll}
                  />
                ))
              )}
            </div>

            {/* right rail: create + spend */}
            <div className="flex flex-col gap-6">
              {isMember ? (
                <OpenBond circle={circle} onCreated={refreshAll} />
              ) : (
                <div className="rounded-xl border border-line bg-panel p-5 text-xs text-faint">
                  You&apos;re not in this Circle, so you can watch but not stake.
                </div>
              )}
              <PayoutPanel circle={circle} onDone={refreshAll} />
              <PayoutList circle={circle} payouts={circlePayouts} onChange={refreshAll} />
            </div>
          </div>
        </>
      )}

      <Footer />
    </div>
  );
}
