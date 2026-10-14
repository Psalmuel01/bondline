"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCircle, useBonds, usePayouts, useNow } from "@/lib/hooks";
import { useCircleSnapshot } from "@/lib/useSnapshots";
import { circleSnapshotKey, type CircleSnapshot } from "@/lib/snapshots";
import { CircleRewards, CircleMembership } from "./CircleRewards";
import { hasV2, Status } from "@/lib/contracts";
import { reliability } from "@/lib/reliability";
import { bpsPct, formatMon, shortAddr } from "@/lib/format";
import { explorerAddr } from "@/lib/chain";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Avatar } from "./Avatar";
import { BondCard } from "./BondCard";
import { OpenBond } from "./OpenBond";
import { PayoutPanel } from "./PayoutPanel";
import { PayoutList } from "./PayoutList";
import { Modal } from "./ui/Modal";
import { EmptyState } from "./ui/EmptyState";
import { SectionHeading } from "./ui/SectionHeading";
import { CircleChat } from "./CircleChat";
import { ProfileName } from "./ProfileName";
import { useProfiles } from "@/lib/useProfiles";
import { CircleSettings } from "./CircleSettings";
import { CircleShare } from "./CircleShare";
import { ActivityTimeline } from "./ActivityTimeline";
import {
  getCircleMetadata,
  isSupabaseConfigured,
  type CircleMetadata,
} from "@/lib/supabase";

/// Full detail for one Circle: pooled balance, member roster, the shared-fund
/// controls, and every Bond tied to this Circle, live-sorted so the ones
/// needing attention float up.
export function CircleDetail({
  address: circleAddress,
}: {
  address: `0x${string}`;
}) {
  const { address } = useAccount();
  const now = useNow();
  const [view, setView] = useState("chat");
  const [filter, setFilter] = useState("ongoing");
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("view");
    setFilter(params.get("filter") === "history" ? "finished" : "ongoing");
    setView(
      requested && ["chat", "commitments", "members", "pot"].includes(requested)
        ? requested
        : "chat",
    );
  }, [circleAddress]);
  const snapshot = useCircleSnapshot(circleAddress);
  const { circle, isLoading, refresh } = useCircle(circleAddress);
  const { bonds, isLoading: bondsLoading, refresh: refreshBonds } = useBonds();
  const {
    payouts,
    isLoading: payoutsLoading,
    refresh: refreshPayouts,
  } = usePayouts();
  const queryClient = useQueryClient();
  const metadataQuery = useQuery({
    queryKey: ["circle-metadata", circleAddress.toLowerCase()],
    queryFn: () => getCircleMetadata(circleAddress),
    enabled: isSupabaseConfigured,
    initialData: snapshot.data?.metadata,
  });
  const metadata = metadataQuery.data ?? snapshot.data?.metadata;
  const metadataLoading = metadataQuery.isLoading && !snapshot.data;
  const setCircleMetadata = useCallback(
    (next: CircleMetadata | undefined) => {
      queryClient.setQueryData(
        ["circle-metadata", circleAddress.toLowerCase()],
        next,
      );
      queryClient.setQueryData<CircleSnapshot>(
        circleSnapshotKey(circleAddress),
        (current) => (current ? { ...current, metadata: next } : current),
      );
    },
    [circleAddress, queryClient],
  );
  // Profile data is preloaded from the dashboard for this exact member list.
  // Bond authors are members, so this keeps the detail route cacheable without
  // pulling unrelated Circles' profiles into the request.
  const profileAddresses = circle?.members ?? [];
  const {
    names,
    profiles,
    save: saveProfile,
    enabled: profilesEnabled,
    isLoading: profilesLoading,
  } = useProfiles(profileAddresses, snapshot.data?.profiles);
  const snapshotReady = Boolean(snapshot.data);
  const isPageLoading =
    snapshot.isLoading ||
    isLoading ||
    (bondsLoading && !snapshotReady) ||
    (payoutsLoading && !snapshotReady) ||
    profilesLoading ||
    metadataLoading;

  function refreshAll() {
    refresh();
    refreshBonds();
    refreshPayouts();
    void queryClient.invalidateQueries({
      queryKey: ["circle-activity", circleAddress.toLowerCase()],
    });
    void queryClient.invalidateQueries({
      queryKey: circleSnapshotKey(circleAddress),
    });
  }

  const circleBonds = (
    bondsLoading && snapshot.data ? snapshot.data.bonds : bonds
  )
    .filter((b) => b.circle.toLowerCase() === circleAddress.toLowerCase())
    .sort((a, b) => {
      // voting first, then active by soonest deadline, then resolved
      const rank = (s: Status) =>
        s === Status.PendingCosign ? 0 : s === Status.Active ? 1 : 2;
      const r = rank(a.status) - rank(b.status);
      if (r !== 0) return r;
      return Number(a.deadline - b.deadline);
    });

  const circlePayouts = (
    payoutsLoading && snapshot.data ? snapshot.data.payouts : payouts
  ).filter((p) => p.circle.toLowerCase() === circleAddress.toLowerCase());

  const isMember =
    !!address &&
    !!circle?.members.some((m) => m.toLowerCase() === address.toLowerCase());

  const ongoing = circleBonds.filter(
    (b) => b.status === Status.Active || b.status === Status.PendingCosign,
  );
  const finished = circleBonds.filter(
    (b) => b.status === Status.Met || b.status === Status.Crossed,
  );
  const circleProgress = reliability(circleBonds);
  const displayed = filter === "ongoing" ? ongoing : finished;
  const chat = circle ? <CircleChat circle={circle} names={names} /> : null;
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-6 sm:px-8">
      <Header />
      <main id="main-content" tabIndex={-1} className="flex flex-col">
        <Link
          href="/"
          className="my-6 self-start text-sm text-muted hover:text-gold"
        >
          ← Your Circles
        </Link>
        {isPageLoading ? (
          <CircleDetailSkeleton />
        ) : !circle ? (
          <EmptyState title="Circle unavailable">
            Check the invitation link or try again shortly.
          </EmptyState>
        ) : (
          <>
            <section className="relative isolate overflow-hidden rounded-3xl border border-line bg-panel p-6 sm:p-8">
              {metadata?.banner_url && (
                <>
                  <img
                    src={metadata.banner_url}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                    className="absolute inset-0 -z-20 h-full w-full object-cover opacity-35"
                  />
                  <div className="absolute inset-0 -z-10 bg-gradient-to-r from-panel via-panel/90 to-panel/40" />
                </>
              )}
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="min-w-0">
                  <p className="mb-2 text-xs font-medium text-gold">
                    {isMember ? "Your Circle" : "Invite-only Circle"}
                  </p>
                  <h1 className="font-display break-words text-3xl font-semibold tracking-tight sm:text-4xl">
                    {circle.name || "Untitled Circle"}
                  </h1>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
                    {metadata?.mission ||
                      "A shared space to check in, make commitments, and keep each other going."}
                  </p>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                  <CircleShare circle={circle} />
                  {isMember && (
                    <CircleSettings
                      circle={circle}
                      metadata={metadata}
                      onMetadata={setCircleMetadata}
                    />
                  )}
                  {isMember && (
                    <button
                      className="primary-button"
                      onClick={() => setCreating(true)}
                    >
                      ＋ Make a commitment
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-muted">
                <button
                  onClick={() => setView("members")}
                  className="flex items-center gap-2 hover:text-bone"
                >
                  <span className="flex -space-x-2">
                    {circle.members.slice(0, 4).map((m) => (
                      <Avatar
                        key={m}
                        addr={m}
                        size={25}
                        imageUrl={profiles[m.toLowerCase()]?.avatar_url}
                        color={profiles[m.toLowerCase()]?.avatar_color}
                      />
                    ))}
                  </span>
                  {circle.members.length} members
                </button>
                <span>{ongoing.length} commitments in progress</span>
                <button
                  onClick={() => setView("pot")}
                  className="hover:text-gold"
                >
                  Pot{" "}
                  <span className="tnum ml-1 text-bone">
                    {formatMon(circle.balance)} MON
                  </span>
                </button>
              </div>
            </section>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["Completed", circleProgress.completed],
                ["Missed", circleProgress.failed],
                [
                  "Completion rate",
                  circleProgress.percentage === null
                    ? "—"
                    : `${circleProgress.percentage}%`,
                ],
                [
                  "Total committed",
                  `${formatMon(circleProgress.totalStake)} MON`,
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="tnum text-lg font-semibold">{value}</p>
                  <p className="mt-1 text-xs text-muted">{label}</p>
                </div>
              ))}
            </div>
            <nav
              aria-label="Circle views"
              className="my-5 flex gap-1 overflow-x-auto border-b border-line pb-3"
            >
              {[
                ["chat", "Chat"],
                ["commitments", "Commitments"],
                ["members", "Members"],
                ["pot", "Pot & rewards"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={view === id}
                  onClick={() => setView(id)}
                  className="workspace-tab"
                >
                  {label}
                  {id === "commitments" && (
                    <span className="text-xs text-faint">{ongoing.length}</span>
                  )}
                </button>
              ))}
            </nav>
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="min-w-0 space-y-5">
                {view === "chat" && chat}
                {view === "commitments" && (
                  <>
                    <SectionHeading
                      title="Commitments"
                      description="Encourage a friend. Share evidence. Follow through."
                    />
                    <nav aria-label="Commitment filter" className="flex gap-1">
                      {[
                        ["ongoing", `In progress · ${ongoing.length}`],
                        ["finished", `History · ${finished.length}`],
                      ].map(([id, label]) => (
                        <button
                          key={id}
                          aria-pressed={filter === id}
                          className="workspace-tab"
                          onClick={() => setFilter(id)}
                        >
                          {label}
                        </button>
                      ))}
                    </nav>
                    {displayed.length ? (
                      displayed.map((b) => (
                        <BondCard
                          key={b.id.toString()}
                          b={b}
                          circle={circle}
                          now={now}
                          onResolved={refreshAll}
                          creatorName={names[b.creator.toLowerCase()]}
                        />
                      ))
                    ) : (
                      <EmptyState
                        title={
                          filter === "ongoing"
                            ? "What’s your next small win?"
                            : "Your story starts here"
                        }
                        action={
                          isMember &&
                          filter === "ongoing" && (
                            <button
                              className="primary-button"
                              onClick={() => setCreating(true)}
                            >
                              Make a commitment
                            </button>
                          )
                        }
                      >
                        {filter === "ongoing"
                          ? "Pick something meaningful, choose a deadline, and let your Circle back you."
                          : "Completed and missed commitments will appear here."}
                      </EmptyState>
                    )}
                  </>
                )}
                {view === "members" && (
                  <>
                    <SectionHeading
                      title="Your people"
                      description="The friends who make showing up a little easier."
                    />
                    <div className="overflow-hidden rounded-2xl border border-line bg-panel">
                      {circle.members.map((m) => (
                        <div
                          key={m}
                          className="flex items-center gap-4 border-b border-line/70 p-5 last:border-0"
                        >
                          <Avatar
                            addr={m}
                            size={42}
                            you={m.toLowerCase() === address?.toLowerCase()}
                            imageUrl={profiles[m.toLowerCase()]?.avatar_url}
                            color={profiles[m.toLowerCase()]?.avatar_color}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">
                              <ProfileName
                                address={m}
                                profile={profiles[m.toLowerCase()]}
                                editable={
                                  profilesEnabled &&
                                  m.toLowerCase() === address?.toLowerCase()
                                }
                                onSave={(profile) => saveProfile(m, profile)}
                              />
                            </div>
                            <a
                              href={explorerAddr(m)}
                              target="_blank"
                              rel="noreferrer"
                              className="tnum mt-1 block text-xs text-muted hover:text-gold"
                            >
                              {shortAddr(m)} ↗
                            </a>
                          </div>
                          <div className="text-right">
                            <p className="tnum text-xs text-bone">
                              {
                                reliability(
                                  circleBonds.filter(
                                    (b) =>
                                      b.creator.toLowerCase() ===
                                      m.toLowerCase(),
                                  ),
                                ).completed
                              }{" "}
                              completed
                            </p>
                            <p className="mt-1 text-[10px] text-faint">
                              In this Circle
                            </p>
                            <span className="text-xs text-faint">
                              {m.toLowerCase() === address?.toLowerCase()
                                ? "You"
                                : "Member"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {hasV2 && (
                      <CircleMembership circle={circle} onChange={refreshAll} />
                    )}
                    <div className="rounded-2xl border border-line p-5">
                      <p className="text-sm text-muted">
                        {bpsPct(circle.cosignThresholdBps)} of eligible
                        reviewers must approve evidence. Backing a friend is
                        encouragement; it does not count as evidence approval.
                      </p>
                    </div>
                  </>
                )}
                {view === "pot" && (
                  <>
                    <SectionHeading
                      title="Shared Pot"
                      description="Missed commitments become rewards for following through."
                    />
                    <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/10 to-panel p-7">
                      <p className="text-sm text-muted">Circle balance</p>
                      <p className="tnum mt-3 text-4xl font-semibold text-gold">
                        {formatMon(circle.balance)}{" "}
                        <span className="text-lg">MON</span>
                      </p>
                      {metadata?.pot_goal && (
                        <p className="mt-4 text-sm text-muted">
                          Goal: {metadata.pot_goal} MON
                        </p>
                      )}
                      <a
                        href={explorerAddr(circle.address)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-5 inline-block text-xs text-muted hover:text-gold"
                      >
                        View Circle on explorer ↗
                      </a>
                    </div>
                    {hasV2 ? (
                      <CircleRewards
                        circle={circle}
                        bonds={circleBonds}
                        onChange={refreshAll}
                      />
                    ) : (
                      <PayoutPanel circle={circle} onDone={refreshAll} />
                    )}
                    <PayoutList
                      circle={circle}
                      payouts={circlePayouts}
                      onChange={refreshAll}
                    />
                  </>
                )}
              </div>
              <aside className="min-w-0 space-y-5 lg:sticky lg:top-6">
                {view !== "chat" && (
                  <div className="rounded-2xl border border-gold/25 bg-panel p-5">
                    <span aria-hidden="true" className="text-2xl text-gold">
                      ↗
                    </span>
                    <h2 className="font-display mt-3 text-lg font-semibold">
                      Keep the conversation going
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      Check in with your Circle while you work toward your next
                      win.
                    </p>
                    <button
                      className="secondary-button mt-5 w-full"
                      onClick={() => setView("chat")}
                    >
                      Open Circle chat →
                    </button>
                  </div>
                )}
                {ongoing.length > 0 && (
                  <div className="rounded-2xl border border-line bg-panel p-5">
                    <h2 className="font-display text-base font-semibold">
                      In the works{" "}
                      <span className="ml-1 text-xs font-normal text-faint">
                        {ongoing.length}
                      </span>
                    </h2>
                    {ongoing.length ? (
                      <div className="mt-2 divide-y divide-line">
                        {ongoing.slice(0, 3).map((b) => (
                          <button
                            key={b.id.toString()}
                            onClick={() => {
                              setView("commitments");
                              setFilter("ongoing");
                            }}
                            className="block w-full py-4 text-left"
                          >
                            <p className="text-xs text-gold">
                              {b.status === Status.PendingCosign
                                ? "Evidence ready"
                                : "In progress"}
                            </p>
                            <p className="mt-1 line-clamp-2 text-sm leading-relaxed">
                              {b.description}
                            </p>
                            <p className="mt-2 text-xs text-muted">
                              {names[b.creator.toLowerCase()] ||
                                shortAddr(b.creator)}{" "}
                              · {formatMon(b.stake)} MON
                            </p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm leading-relaxed text-muted">
                        A fresh start. Make the first commitment for your
                        Circle.
                      </p>
                    )}
                  </div>
                )}
                {!isMember && hasV2 && (
                  <CircleMembership circle={circle} onChange={refreshAll} />
                )}
                <ActivityTimeline
                  compact
                  bonds={circleBonds}
                  names={names}
                  snapshotEvents={snapshot.data?.activity}
                />
              </aside>
            </div>
            <Modal
              open={creating}
              onClose={() => setCreating(false)}
              title="Make a commitment"
            >
              <OpenBond
                circle={circle}
                onCreated={() => {
                  setCreating(false);
                  setView("commitments");
                  setFilter("ongoing");
                  refreshAll();
                }}
              />
            </Modal>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function CircleDetailSkeleton() {
  return (
    <div className="mt-4 animate-pulse" aria-label="Loading Circle">
      <section className="rounded-2xl border border-line bg-panel/80 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="h-9 w-56 rounded bg-panel-hi" />
            <div className="h-3 w-24 rounded bg-panel-hi" />
          </div>
          <div className="h-16 w-32 rounded bg-panel-hi" />
        </div>
        <div className="mt-7 h-4 w-48 rounded bg-panel-hi" />
        <div className="mt-3 flex gap-3">
          <div className="h-8 w-24 rounded bg-panel-hi" />
          <div className="h-8 w-24 rounded bg-panel-hi" />
        </div>
      </section>
      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <div className="h-6 w-40 rounded bg-panel-hi" />
          <div className="h-44 rounded-xl border border-line bg-panel" />
          <div className="h-44 rounded-xl border border-line bg-panel" />
        </div>
        <div className="space-y-6">
          <div className="h-40 rounded-xl border border-line bg-panel" />
          <div className="h-40 rounded-xl border border-line bg-panel" />
        </div>
      </div>
    </div>
  );
}
