"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { CORE_ADDRESS, coreAbi, hasV2, Status } from "@/lib/contracts";
import { useBonds, useCircles, useNow } from "@/lib/hooks";
import { countdownParts } from "@/lib/format";
import { usePreferences } from "@/lib/usePreferences";
import { useAccountActivity } from "@/lib/useAccountActivity";
import { eventNotification } from "@/lib/notification-events";
import { evidenceNotification } from "@/lib/review-notification";

export function NotificationCenter() {
  const { address } = useAccount();
  const { circles, error: circlesError } = useCircles();
  const { bonds, error: bondsError } = useBonds();
  const now = useNow();
  const [open, setOpen] = useState(false);
  const { preferences, ready, markRead } = usePreferences();
  const activity = useAccountActivity(circles);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const pending = useMemo(
    () =>
      address
        ? bonds.filter(
            (bond) =>
              bond.status === Status.PendingCosign &&
              bond.creator.toLowerCase() !== address.toLowerCase(),
          )
        : [],
    [address, bonds],
  );
  const flags = useReadContracts({
    contracts: pending.flatMap((bond) => [
      {
        address: CORE_ADDRESS,
        abi: coreAbi,
        functionName: "cosignState" as const,
        args: [bond.id] as const,
      },
      {
        address: CORE_ADDRESS,
        abi: coreAbi,
        functionName: "hasResponded" as const,
        args: [bond.id, address!] as const,
      },
      ...(hasV2
        ? [
            {
              address: CORE_ADDRESS,
              abi: coreAbi,
              functionName: "hasBacked" as const,
              args: [bond.id, address!] as const,
            },
          ]
        : []),
    ]),
    query: {
      enabled: !!address && pending.length > 0,
      refetchInterval: 10000,
      staleTime: 5000,
    },
  });
  const actionable = useMemo(() => {
    if (!address) return [];
    return bonds.flatMap((bond) => {
      const circle = circles.find(
        (item) => item.address.toLowerCase() === bond.circle.toLowerCase(),
      );
      if (!circle) return [];
      const mine = bond.creator.toLowerCase() === address.toLowerCase();
      if (bond.status === Status.PendingCosign && !mine) {
        const index = pending.findIndex((item) => item.id === bond.id);
        const base = index * (hasV2 ? 3 : 2);
        const state = flags.data?.[base]?.result;
        const responded = flags.data?.[base + 1]?.result;
        const backed = hasV2 ? flags.data?.[base + 2]?.result : false;
        if (
          index < 0 ||
          !Array.isArray(state) ||
          typeof responded !== "boolean" ||
          (hasV2 && typeof backed !== "boolean")
        )
          return [];
        const eligibleMembers = hasV2
          ? circle.members.slice(0, Number(state[0]) + 1)
          : circle.members;
        const eligible = eligibleMembers.some(
          (m) => m.toLowerCase() === address.toLowerCase(),
        );
        const title = evidenceNotification({
          backed: backed === true,
          responded,
          eligible,
          closesAt: bond.cosignClosesAt,
          now,
        });
        if (title)
          return [
            {
              id: `review-${bond.id}`,
              circle,
              title,
              body: bond.description,
              tone: "text-gold",
            },
          ];
      }
      if (bond.status === Status.Active && mine) {
        const countdown = countdownParts(bond.deadline, now);
        if (!countdown.expired && Number(bond.deadline) * 1000 - now < 86400000)
          return [
            {
              id: `deadline-${bond.id}`,
              circle,
              title: `Deadline in ${countdown.text}`,
              body: bond.description,
              tone: "text-forfeit",
            },
          ];
      }
      return [];
    });
  }, [address, bonds, circles, now, pending, flags.data]);
  const owned = new Set(
    bonds
      .filter((b) => b.creator.toLowerCase() === address?.toLowerCase())
      .map((b) => b.id.toString()),
  );
  const recent = preferences.activity
    ? (activity.data || []).flatMap((event) => {
        const circle = circles.find(
          (c) =>
            c.address.toLowerCase() === event.circle_address?.toLowerCase(),
        );
        const item = eventNotification(event, owned);
        return circle && item
          ? [
              {
                id: `event-${event.tx_hash}-${event.log_index}`,
                circle,
                title: item.title,
                body: item.body,
                tone: "text-bone",
                href: `/circle/${circle.address}?view=${item.view}${item.history ? "&filter=history" : ""}`,
              },
            ]
          : [];
      })
    : [];
  const notices = [
    ...actionable
      .filter((n) =>
        n.id.startsWith("review-")
          ? preferences.evidence
          : preferences.deadlines,
      )
      .map((n) => ({
        ...n,
        href: `/circle/${n.circle.address}?view=commitments`,
      })),
    ...recent,
  ].slice(0, 40);
  const unread = notices.filter((n) => !preferences.readIds.includes(n.id));
  const visible = onlyUnread ? unread : notices;
  const incomplete =
    circlesError ||
    bondsError ||
    activity.isError ||
    flags.isError ||
    flags.data?.some((item) => item.status === "failure");
  return (
    <div ref={root} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Notifications${ready && unread.length ? `, ${unread.length} unread` : ""}`}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-panel-hi hover:text-gold"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-5 w-5 fill-none stroke-current stroke-2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {ready && unread.length > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-gold ring-2 ring-bg" />
        )}
      </button>
      {open && (
        <div className="fixed left-3 right-3 top-20 z-40 max-h-[75dvh] overflow-y-auto rounded-2xl border border-line bg-panel shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-96">
          <div className="flex items-center justify-between border-b border-line p-4">
            <h2 className="font-display text-lg font-semibold">Your updates</h2>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
              className="icon-button"
            >
              ×
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2">
            <button
              aria-pressed={onlyUnread}
              onClick={() => setOnlyUnread((v) => !v)}
              className="workspace-tab"
            >
              {onlyUnread ? "Unread" : "All updates"}
            </button>
            <button
              disabled={!ready || !unread.length}
              onClick={() => markRead(notices.map((n) => n.id))}
              className="text-xs text-gold disabled:opacity-40"
            >
              Mark all read
            </button>
          </div>
          {!ready ? (
            <p className="p-5 text-sm text-muted">Restoring your updates…</p>
          ) : visible.length ? (
            visible.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => {
                  markRead([item.id]);
                  setOpen(false);
                }}
                className="flex gap-3 border-b border-line p-4 hover:bg-panel-hi"
              >
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${preferences.readIds.includes(item.id) ? "bg-line" : "bg-gold"}`}
                />
                <div className="min-w-0">
                  <p className={`text-xs font-semibold ${item.tone}`}>
                    {item.title}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-muted">
                    {item.body}
                  </p>
                  <p className="mt-2 text-[11px] text-faint">
                    {item.circle.name}
                    {preferences.readIds.includes(item.id)
                      ? " · Read"
                      : " · Unread"}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <div className="p-6">
              <p className="font-medium">
                {incomplete
                  ? "Some updates are unavailable"
                  : "You’re all caught up."}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {incomplete
                  ? "Open your Circle to check its current goals and outcomes."
                  : "Deadlines, evidence reviews, backing, and outcomes will appear here when relevant."}
              </p>
            </div>
          )}
          <div className="flex justify-between p-4 text-xs text-muted">
            <Link
              href="/app/activity"
              onClick={() => setOpen(false)}
              className="hover:text-gold"
            >
              View activity →
            </Link>
            <Link
              href="/settings#notifications"
              onClick={() => setOpen(false)}
              className="hover:text-gold"
            >
              Preferences
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
