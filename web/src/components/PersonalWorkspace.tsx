"use client";
import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";
import { useBonds, useCircles, useNow } from "@/lib/hooks";
import { Status } from "@/lib/contracts";
import { useProfiles } from "@/lib/useProfiles";
import { toActivity } from "@/lib/snapshots";
import { useAccountActivity } from "@/lib/useAccountActivity";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Dashboard } from "./Dashboard";
import { BondCard } from "./BondCard";
import { ActivityTimeline } from "./ActivityTimeline";
import { ConnectButton } from "./ConnectButton";
import { EmptyState } from "./ui/EmptyState";
import { Modal } from "./ui/Modal";
export function PersonalWorkspace({ view }: { view: string }) {
  const { address } = useAccount();
  const {
    circles,
    isLoading: circlesLoading,
    error: circlesError,
  } = useCircles();
  const {
    bonds,
    isLoading: bondsLoading,
    error: bondsError,
    refresh,
  } = useBonds();
  const now = useNow();
  const [filter, setFilter] = useState("active");
  const [scope, setScope] = useState("mine");
  const [choosing, setChoosing] = useState(false);
  const activity = useAccountActivity(circles);
  const joined = circles.filter((c) =>
    c.members.some((m) => m.toLowerCase() === address?.toLowerCase()),
  );
  const personal = bonds.filter((b) =>
    scope === "mine"
      ? b.creator.toLowerCase() === address?.toLowerCase()
      : joined.some((c) => c.address.toLowerCase() === b.circle.toLowerCase()),
  );
  const visible = personal
    .filter(
      (b) =>
        filter === "all" ||
        (filter === "review" && b.status === Status.PendingCosign) ||
        (filter === "active" && b.status === Status.Active) ||
        (filter === "history" &&
          (b.status === Status.Met || b.status === Status.Crossed)),
    )
    .sort((a, b) => Number(a.deadline - b.deadline));
  const { names } = useProfiles([...new Set(joined.flatMap((c) => c.members))]);
  const title =
    view === "circles"
      ? "Your Circles"
      : view === "activity"
        ? "Your Circle activity"
        : "Your commitments";
  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8">
      <Header />
      <main id="main-content" className="space-y-7 py-10">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">
              Your workspace
            </p>
            <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">
              {title}
            </h1>
            <p className="mt-3 text-sm text-muted">
              {view === "activity"
                ? "Backing, evidence, outcomes, and rewards—recorded as they happen."
                : view === "circles"
                  ? "Find your people and give your goals a shared home."
                  : "A clear view of what you promised, what needs review, and what followed through."}
            </p>
          </div>
          {address && view === "commitments" && (
            <button
              className="primary-button"
              onClick={() => setChoosing(true)}
            >
              ＋ Make a commitment
            </button>
          )}
        </div>
        {!address ? (
          <EmptyState
            title="Your workspace is ready when you are"
            action={<ConnectButton intent="signin" label="Sign in" />}
          >
            Return with the same passkey or wallet to find your Circles and
            commitments.
          </EmptyState>
        ) : view === "circles" ? (
          <Dashboard compact />
        ) : view === "activity" ? (
          <>
            {activity.isError ? (
              <EmptyState
                title="Recent activity is unavailable"
                action={
                  <button
                    className="secondary-button"
                    onClick={() => void activity.refetch()}
                  >
                    Try again
                  </button>
                }
              >
                Your on-chain history is still available on the explorer.
              </EmptyState>
            ) : activity.isLoading || circlesLoading ? (
              <div
                className="h-64 animate-pulse rounded-2xl bg-panel"
                aria-label="Loading activity"
              />
            ) : activity.data?.length ? (
              <ActivityTimeline
                bonds={[]}
                names={names}
                snapshotEvents={activity.data.map(toActivity)}
              />
            ) : (
              <EmptyState
                title="Your Circle’s story will appear here"
                action={
                  <Link href="/app/circles" className="primary-button">
                    Find your Circle →
                  </Link>
                }
              >
                New commitments, backing, evidence reviews, and settlements will
                form a real timeline. Private conversation stays in Circle chat.
              </EmptyState>
            )}
          </>
        ) : (
          <>
            <nav aria-label="Commitment scope" className="flex gap-1">
              <button
                className="workspace-tab"
                aria-pressed={scope === "mine"}
                onClick={() => setScope("mine")}
              >
                Yours
              </button>
              <button
                className="workspace-tab"
                aria-pressed={scope === "circle"}
                onClick={() => setScope("circle")}
              >
                Your Circles
              </button>
            </nav>
            <nav
              aria-label="Commitment state"
              className="flex gap-1 overflow-x-auto"
            >
              {[
                ["active", "In progress"],
                ["review", "Evidence review"],
                ["history", "History"],
                ["all", "All"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className="workspace-tab"
                  aria-pressed={filter === id}
                  onClick={() => setFilter(id)}
                >
                  {label}
                </button>
              ))}
            </nav>
            {circlesError || bondsError ? (
              <EmptyState
                title="Your commitments are unavailable right now"
                action={
                  <button className="secondary-button" onClick={refresh}>
                    Try again
                  </button>
                }
              >
                An unavailable view does not change your commitments. You can
                also open your Circle to check its state.
              </EmptyState>
            ) : circlesLoading || bondsLoading ? (
              <div
                className="h-48 animate-pulse rounded-2xl bg-panel"
                aria-label="Loading commitments"
              />
            ) : visible.length ? (
              <div className="grid items-start gap-5 lg:grid-cols-2">
                {visible.map((b) => {
                  const circle = circles.find(
                    (c) => c.address.toLowerCase() === b.circle.toLowerCase(),
                  );
                  return circle ? (
                    <div key={b.id.toString()} className="min-w-0">
                      <Link
                        href={`/circle/${circle.address}?view=commitments${b.status === Status.Met || b.status === Status.Crossed ? "&filter=history" : ""}`}
                        className="mb-3 inline-block text-xs text-muted hover:text-gold"
                      >
                        {circle.name} →
                      </Link>
                      <BondCard
                        b={b}
                        circle={circle}
                        now={now}
                        onResolved={refresh}
                        creatorName={names[b.creator.toLowerCase()]}
                      />
                    </div>
                  ) : null;
                })}
              </div>
            ) : (
              <EmptyState
                title={
                  filter === "review"
                    ? "No evidence waiting in this view"
                    : filter === "history"
                      ? "Your record grows one result at a time"
                      : "You haven’t made a commitment in this view"
                }
                action={
                  <button
                    className="primary-button"
                    onClick={() => setChoosing(true)}
                  >
                    Make a commitment →
                  </button>
                }
              >
                A commitment brings together a goal, deadline, stake, and a
                clear rule for completion. Choose your Circle to begin.
              </EmptyState>
            )}
          </>
        )}
      </main>
      <Modal
        open={choosing}
        onClose={() => setChoosing(false)}
        title="Choose your Circle"
      >
        <div className="space-y-3 p-6">
          {joined.length ? (
            joined.map((c) => (
              <Link
                key={c.address}
                href={`/circle/${c.address}?view=commitments`}
                onClick={() => setChoosing(false)}
                className="flex items-center justify-between rounded-xl border border-line p-4 text-sm hover:border-gold/40"
              >
                {c.name}
                <span className="text-gold">Open →</span>
              </Link>
            ))
          ) : (
            <EmptyState
              title="Start with your people"
              action={
                <Link
                  className="primary-button"
                  href="/app/circles"
                  onClick={() => setChoosing(false)}
                >
                  Create or join a Circle →
                </Link>
              }
            >
              You need to belong to a Circle before committing a stake.
            </EmptyState>
          )}
        </div>
      </Modal>
      <Footer />
    </div>
  );
}
