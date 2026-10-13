"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import type { Bond, Circle } from "@/lib/contracts";
import { Status } from "@/lib/contracts";
import { formatMon } from "@/lib/format";
import { getMessages, isSupabaseConfigured } from "@/lib/supabase";
import { circleSnapshotKey, getCircleSnapshot } from "@/lib/snapshots";
import { Avatar } from "./Avatar";
import { useWalletSession } from "@/lib/useWalletSession";

/// One Circle tile on the dashboard. Surfaces the numbers that matter at a
/// glance: the Pot balance, live/cosigning count, and whether it's your turn to
/// cosign.
export function CircleCard({
  circle,
  bonds,
}: {
  circle: Circle;
  bonds: Bond[];
}) {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useWalletSession();
  const mine = bonds.filter(
    (b) => b.circle.toLowerCase() === circle.address.toLowerCase(),
  );
  const live = mine.filter((b) => b.status === Status.Active).length;
  const cosigning = mine.filter((b) => b.status === Status.PendingCosign);

  const isMember =
    !!address &&
    circle.members.some(
      (member) => member.toLowerCase() === address.toLowerCase(),
    );

  function prefetchCircle() {
    if (!isSupabaseConfigured) return;
    const circleKey = circle.address.toLowerCase();
    void queryClient.prefetchQuery({
      queryKey: circleSnapshotKey(circle.address),
      queryFn: () => getCircleSnapshot(circle.address),
    });
    if (isMember && isAuthenticated)
      void queryClient.prefetchQuery({
        queryKey: ["circle-messages", circleKey, address?.toLowerCase()],
        queryFn: () => getMessages(circle.address),
      });
  }

  const completed = mine.filter((b) => b.status === Status.Met).length;
  return (
    <Link
      href={`/circle/${circle.address}`}
      onMouseEnter={prefetchCircle}
      onFocus={prefetchCircle}
      className="group flex min-h-64 flex-col rounded-2xl border border-line bg-panel p-6 transition hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-xl hover:shadow-black/15"
    >
      <div className="mb-6 flex items-start justify-between">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 font-display text-xl text-gold"
        >
          {(circle.name || "C").slice(0, 1).toUpperCase()}
        </span>
        <span className="rounded-full bg-panel-hi px-2.5 py-1 text-[11px] text-muted">
          {isMember ? "Your Circle" : "Invite-only"}
        </span>
      </div>
      <h3 className="font-display text-xl font-semibold tracking-tight">
        {circle.name || "Untitled Circle"}
      </h3>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex -space-x-2">
          {circle.members.slice(0, 4).map((m) => (
            <Avatar key={m} addr={m} size={25} />
          ))}
        </div>
        <p className="text-xs text-muted">
          {circle.members.length}{" "}
          {circle.members.length === 1 ? "member" : "members"}
        </p>
      </div>
      <div className="my-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
        <span>{live} active</span>
        <span>{completed} completed</span>
        {cosigning.length > 0 && (
          <span className="text-gold">{cosigning.length} in review</span>
        )}
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
        <span className="text-xs text-muted">
          Pot{" "}
          <span className="tnum ml-1 text-bone">
            {formatMon(circle.balance)} MON
          </span>
        </span>
        <span className="text-sm font-medium text-gold">
          {isMember ? "Open chat" : "View Circle"}{" "}
          <span className="inline-block transition group-hover:translate-x-1">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
