"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCircles, useBonds } from "@/lib/hooks";
import { Status } from "@/lib/contracts";
import { formatMon, shortAddr } from "@/lib/format";
import { reliability } from "@/lib/reliability";
import { Avatar } from "../Avatar";
import { useProfiles } from "@/lib/useProfiles";
export function ProductPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className="h-[560px]">
      {visible ? (
        <LivePreview />
      ) : (
        <div
          aria-label="Loading product preview"
          className="h-full animate-pulse rounded-3xl border border-line bg-panel"
        />
      )}
    </div>
  );
}
function LivePreview() {
  const {
    circles,
    isLoading: circleLoading,
    error: circleError,
  } = useCircles();
  const { bonds, isLoading: bondLoading, error: bondError } = useBonds();
  const circle =
    circles.find((c) =>
      bonds.some((b) => b.circle.toLowerCase() === c.address.toLowerCase()),
    ) || circles[0];
  const { names, profiles } = useProfiles(circle?.members ?? []);
  const goals = circle
    ? bonds.filter(
        (b) => b.circle.toLowerCase() === circle.address.toLowerCase(),
      )
    : [];
  const stats = reliability(goals);
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-gold/20 bg-panel shadow-2xl shadow-black/20">
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <span className="text-xs font-medium text-muted">Inside Bondline</span>
        <span className="rounded-full bg-confirm/10 px-2.5 py-1 text-[10px] text-confirm">
          Public contract data
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-6">
        {circleLoading || bondLoading ? (
          <div aria-label="Loading live Circle" className="space-y-4">
            <div className="h-8 w-2/3 animate-pulse rounded bg-panel-hi" />
            <div className="h-24 animate-pulse rounded-xl bg-panel-hi" />
            <div className="h-24 animate-pulse rounded-xl bg-panel-hi" />
          </div>
        ) : circleError || bondError ? (
          <div className="py-14 text-center">
            <h2 className="font-display text-xl font-semibold">
              A place for your next promise.
            </h2>
            <p className="mt-3 text-sm text-muted">
              Live preview is unavailable right now. Explore how Circles work.
            </p>
            <Link
              href="/docs/circles"
              className="mt-5 inline-block text-sm text-gold"
            >
              Circle guide →
            </Link>
          </div>
        ) : !circle ? (
          <div className="py-12">
            <p className="font-display text-2xl font-semibold">
              Your Circle starts with your people.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Create a shared conversation, make your first goal, and let the
              record grow from real outcomes.
            </p>
            <Link
              href="/docs/getting-started"
              className="mt-5 inline-block text-sm text-gold"
            >
              Get started →
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display break-words text-2xl font-semibold">
                  Circle workspace
                </h2>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {circle.members.slice(0, 4).map((m) => (
                      <Avatar
                        key={m}
                        addr={m}
                        size={27}
                        imageUrl={profiles[m.toLowerCase()]?.avatar_url}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted">
                    {circle.members.length} members
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted">Circle Pot</p>
                <p className="tnum mt-1 text-sm text-gold">
                  {formatMon(circle.balance)} MON
                </p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4 border-y border-line py-4">
              {[
                ["Completed", stats.completed],
                ["In progress", stats.active],
                [
                  "Completion",
                  stats.percentage === null ? "—" : `${stats.percentage}%`,
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="tnum text-lg font-semibold">{value}</p>
                  <p className="mt-1 text-[10px] text-muted">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              {goals.length ? (
                goals
                  .slice(-2)
                  .reverse()
                  .map((b) => (
                    <div
                      key={b.id.toString()}
                      className="rounded-xl border border-line bg-bg/50 p-4"
                    >
                      <div className="mb-2 flex justify-between gap-3 text-[10px]">
                        <span className="text-muted">
                          {names[b.creator.toLowerCase()] ||
                            shortAddr(b.creator)}
                        </span>
                        <span
                          className={
                            b.status === Status.Met
                              ? "text-confirm"
                              : "text-gold"
                          }
                        >
                          {b.status === Status.Met
                            ? "Completed"
                            : b.status === Status.Crossed
                              ? "Missed"
                              : b.status === Status.PendingCosign
                                ? "Evidence review"
                                : "In progress"}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-sm leading-relaxed">
                        {b.description}
                      </p>
                      <p className="tnum mt-3 text-xs text-muted">
                        {formatMon(b.stake)} MON committed
                      </p>
                    </div>
                  ))
              ) : (
                <p className="py-6 text-sm text-muted">
                  This Circle is ready for its first commitment.
                </p>
              )}
            </div>
            <Link
              href={`/circle/${circle.address}?view=commitments`}
              className="mt-5 block text-sm font-medium text-gold"
            >
              Open this Circle →
            </Link>
          </>
        )}
      </div>
      <p className="border-t border-line px-6 py-3 text-[10px] text-faint">
        Actual public Circle records. Conversation content is private to
        members.
      </p>
    </div>
  );
}
