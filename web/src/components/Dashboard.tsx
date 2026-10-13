"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useCircles, useBonds, useNow } from "@/lib/hooks";
import { isConfigured, Status } from "@/lib/contracts";
import { getMessages, isSupabaseConfigured } from "@/lib/supabase";
import { circleSnapshotKey, getCircleSnapshot } from "@/lib/snapshots";
import { reliability } from "@/lib/reliability";
import { formatMon, countdownParts } from "@/lib/format";
import Link from "next/link";
import { CircleCard } from "./CircleCard";
import { GettingStartedChecklist } from "./GettingStartedChecklist";
import { CreateCircle } from "./CreateCircle";
import { Modal } from "./ui/Modal";
import { EmptyState } from "./ui/EmptyState";
import { SectionHeading } from "./ui/SectionHeading";
import { useWalletSession } from "@/lib/useWalletSession";

/// Multi-group dashboard: every Circle you're in, plus a toggle to spin up a new
/// one. Circles you're not a member of are shown dimmed under "other Circles" so
/// the registry is visible without cluttering your crews.
export function Dashboard({ compact = false }: { compact?: boolean } = {}) {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useWalletSession();
  const { circles, isLoading: circlesLoading, error, refresh } = useCircles();
  const {
    bonds,
    isLoading: bondsLoading,
    error: bondsError,
    refresh: refreshBonds,
  } = useBonds();
  const isLoading = circlesLoading || bondsLoading;
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState("mine");
  const now = useNow();

  const { mine, others } = useMemo(() => {
    const mine = [];
    const others = [];
    for (const c of circles) {
      if (
        address &&
        c.members.some((m) => m.toLowerCase() === address.toLowerCase())
      ) {
        mine.push(c);
      } else {
        others.push(c);
      }
    }
    return { mine, others };
  }, [circles, address]);

  function refreshAll() {
    refresh();
    refreshBonds();
    setCreating(false);
  }

  // Warm every detail route while the dashboard is open. Navigation then reads
  // from memory instead of starting a new chain/Supabase waterfall.
  useEffect(() => {
    if (!isSupabaseConfigured || isLoading) return;
    for (const circle of mine.slice(0, 10)) {
      const circleKey = circle.address.toLowerCase();
      void queryClient.prefetchQuery({
        queryKey: circleSnapshotKey(circle.address),
        queryFn: () => getCircleSnapshot(circle.address),
      });
      if (
        isAuthenticated &&
        address &&
        circle.members.some(
          (member) => member.toLowerCase() === address.toLowerCase(),
        )
      ) {
        void queryClient.prefetchQuery({
          queryKey: ["circle-messages", circleKey, address?.toLowerCase()],
          queryFn: () => getMessages(circle.address),
        });
      }
    }
  }, [address, mine, isAuthenticated, isLoading, queryClient]);

  if (!isConfigured)
    return (
      <EmptyState title="Bondline is getting ready">
        Please check back shortly.
      </EmptyState>
    );
  const personal = bonds.filter(
    (b) => b.creator.toLowerCase() === address?.toLowerCase(),
  );
  const stats = reliability(personal);
  const upcoming = personal
    .filter(
      (b) => b.status === Status.Active || b.status === Status.PendingCosign,
    )
    .sort((a, b) => Number(a.deadline - b.deadline))
    .slice(0, 3);
  const visible = address && view === "mine" ? mine : others;
  return (
    <div className="space-y-8">
      {address && !isLoading && (
        <GettingStartedChecklist
          joined={mine.length > 0}
          committed={personal.length > 0}
          circleHref={
            mine[0] ? `/circle/${mine[0].address}?view=commitments` : undefined
          }
          onCreate={() => setCreating(true)}
          onDiscover={() => setView("discover")}
        />
      )}
      {address && !compact && (
        <div className="flex flex-wrap gap-x-10 gap-y-5 border-b border-line pb-7">
          {[
            ["In progress", stats.active],
            ["Completed", stats.completed],
            ["Completion streak", stats.streak],
            ["Your Circles", mine.length],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="tnum text-2xl font-semibold">
                {isLoading || error || bondsError ? "—" : value}
              </p>
              <p className="mt-1 text-xs text-muted">{label}</p>
            </div>
          ))}
          <Link
            href="/profile"
            className="ml-auto self-center text-sm text-gold"
          >
            Your progress ↗
          </Link>
        </div>
      )}
      {address && !compact && upcoming.length > 0 && (
        <section className="space-y-4">
          <SectionHeading
            title="Keep the momentum"
            description="Your commitments in progress. Open one to check in or share evidence."
          />
          <div className="grid gap-3 md:grid-cols-3">
            {upcoming.map((b) => (
              <Link
                key={b.id.toString()}
                href={`/circle/${b.circle}?view=commitments`}
                className="rounded-2xl border border-line bg-panel p-5 transition hover:border-gold/40"
              >
                <p className="text-xs text-gold">
                  {b.status === Status.PendingCosign
                    ? "Your evidence is in review"
                    : countdownParts(b.deadline, now).expired
                      ? "Ready for settlement"
                      : `${countdownParts(b.deadline, now).text} left`}
                </p>
                <p className="mt-3 line-clamp-2 text-sm font-medium leading-relaxed">
                  {b.description}
                </p>
                <p className="mt-4 text-xs text-muted">
                  {formatMon(b.stake)} MON ·{" "}
                  {circles.find(
                    (c) => c.address.toLowerCase() === b.circle.toLowerCase(),
                  )?.name || "Your Circle"}{" "}
                  →
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="space-y-5">
        <SectionHeading
          title={address ? "Your spaces" : "Explore Circles"}
          description={
            address
              ? "Conversations and commitments, in good company."
              : "Circles are invite-only. A member can invite your account."
          }
          action={
            address && (
              <button
                onClick={() => setCreating(true)}
                className="primary-button"
              >
                ＋ Create Circle
              </button>
            )
          }
        />
        {address && (
          <nav aria-label="Circle discovery" className="flex gap-1">
            <button
              onClick={() => setView("mine")}
              aria-pressed={view === "mine"}
              className="workspace-tab"
            >
              Your Circles{" "}
              <span className="text-xs text-faint">{mine.length}</span>
            </button>
            <button
              onClick={() => setView("discover")}
              aria-pressed={view === "discover"}
              className="workspace-tab"
            >
              Discover{" "}
              <span className="text-xs text-faint">{others.length}</span>
            </button>
          </nav>
        )}
        {isLoading && circles.length === 0 ? (
          <div
            aria-label="Loading Circles"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-64 animate-pulse rounded-2xl bg-panel"
              />
            ))}
          </div>
        ) : error || bondsError ? (
          <EmptyState
            title="Couldn’t load your Circles"
            action={
              <button className="secondary-button" onClick={refreshAll}>
                Try again
              </button>
            }
          >
            Your Circles are still safe. Please try again.
          </EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState
            title={
              view === "mine" && address
                ? "Your people belong here"
                : "No Circles to discover yet"
            }
            action={
              address &&
              view === "mine" && (
                <button
                  className="primary-button"
                  onClick={() => setCreating(true)}
                >
                  Create your first Circle
                </button>
              )
            }
          >
            {address && view === "mine"
              ? "Start a Circle with friends, or ask a member for an invitation to theirs."
              : "Create a space for your friends to follow through together."}
          </EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((c) => (
              <CircleCard key={c.address} circle={c} bonds={bonds} />
            ))}
          </div>
        )}
      </section>
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Create a Circle"
      >
        <CreateCircle onCreated={refreshAll} />
      </Modal>
    </div>
  );
}
