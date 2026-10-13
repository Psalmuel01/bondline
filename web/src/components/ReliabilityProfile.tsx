"use client";
import { useState } from "react";
import { Avatar } from "./Avatar";
import { ProfileName } from "./ProfileName";
import { ConnectButton } from "./ConnectButton";
import { EmptyState } from "./ui/EmptyState";
import { SectionHeading } from "./ui/SectionHeading";
import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { useBonds, useCircles } from "@/lib/hooks";
import { reliability } from "@/lib/reliability";
import { formatMon, shortAddr } from "@/lib/format";
import { useProfiles } from "@/lib/useProfiles";
import { CORE_ADDRESS, coreAbi, hasV2, Status } from "@/lib/contracts";
import { useBondlineWrite } from "@/lib/useBondlineWrite";
export function ReliabilityProfile() {
  const { address } = useAccount();
  const { bonds, isLoading, error, refresh } = useBonds();
  const { circles } = useCircles();
  const { profiles, save, enabled } = useProfiles(address ? [address] : []);
  const [filter, setFilter] = useState("all");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const mine = bonds.filter(
    (b) => b.creator.toLowerCase() === address?.toLowerCase(),
  );
  const stats = reliability(mine);
  const joined = circles.filter((c) =>
    c.members.some((m) => m.toLowerCase() === address?.toLowerCase()),
  );
  const supporters = useReadContract({
    address: CORE_ADDRESS,
    abi: coreAbi,
    functionName: "uniqueCosigners",
    args: [address ?? CORE_ADDRESS],
    query: { enabled: hasV2 && !!address, refetchInterval: 15000 },
  });
  const balance = useReadContract({
    address: CORE_ADDRESS,
    abi: coreAbi,
    functionName: "refundCredit",
    args: [address ?? CORE_ADDRESS],
    query: { enabled: hasV2 && !!address, refetchInterval: 15000 },
  });
  const write = useBondlineWrite(() => {
    refresh();
    void balance.refetch();
  });
  if (!address)
    return (
      <section className="py-12">
        <EmptyState title="Your progress lives here" action={<ConnectButton />}>
          Sign in to see your commitments and the promises you’ve kept.
        </EmptyState>
      </section>
    );
  const history = [...mine]
    .filter(
      (b) =>
        filter === "all" ||
        (filter === "active" &&
          (b.status === Status.Active || b.status === Status.PendingCosign)) ||
        (filter === "completed" && b.status === Status.Met) ||
        (filter === "missed" && b.status === Status.Crossed),
    )
    .sort((a, b) => Number(b.deadline - a.deadline));
  return (
    <section className="space-y-8 py-10">
      <div className="flex flex-wrap items-center gap-5">
        <Avatar
          addr={address}
          size={64}
          imageUrl={profiles[address.toLowerCase()]?.avatar_url}
          color={profiles[address.toLowerCase()]?.avatar_color}
        />
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold">
            Your profile
          </p>
          <div className="font-display text-2xl font-semibold">
            <ProfileName
              address={address}
              profile={profiles[address.toLowerCase()]}
              editable={enabled}
              onSave={(profile) => save(address, profile)}
            />
          </div>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(address);
                setCopied(true);
                setCopyError("");
              } catch {
                setCopyError(
                  "Open your account menu to select and copy the full address.",
                );
              }
            }}
            className="tnum mt-2 text-xs text-muted hover:text-gold"
          >
            {copied
              ? "Address copied ✓"
              : `${shortAddr(address)} · Copy address`}
          </button>
          {copyError && (
            <p role="alert" className="mt-2 text-xs text-forfeit">
              {copyError}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [
            "Completion rate",
            stats.percentage === null ? "—" : `${stats.percentage}%`,
          ],
          ["Completed", stats.completed],
          ["In progress", stats.active],
          ["Completion streak", stats.streak],
        ].map(([label, value]) => (
          <div
            className="rounded-2xl border border-line bg-panel p-5"
            key={label}
          >
            <p className="text-xs text-muted">{label}</p>
            <p className="tnum mt-3 text-3xl font-semibold">
              {isLoading ? "—" : value}
            </p>
          </div>
        ))}
      </div>
      {(balance.data ?? 0n) > 0n && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold/30 bg-gold/5 p-5">
          <div>
            <p className="font-medium">Your stake is ready to return</p>
            <p className="tnum mt-2 text-sm text-gold">
              {formatMon(balance.data!)} MON
            </p>
          </div>
          <button
            disabled={write.isPending || write.isConfirming}
            onClick={() => write.withdrawRefund(address)}
            className="primary-button"
          >
            {write.isPending || write.isConfirming
              ? "Confirming…"
              : "Receive returned stake"}
          </button>
          {write.error && (
            <p role="alert" className="w-full text-sm text-forfeit">
              {write.error}
            </p>
          )}
        </div>
      )}
      <section className="space-y-4">
        <SectionHeading
          title="Your commitment history"
          description="Every promise is part of your progress."
        />
        <nav
          aria-label="History filters"
          className="flex gap-1 overflow-x-auto"
        >
          {[
            ["all", "All"],
            ["active", "In progress"],
            ["completed", "Completed"],
            ["missed", "Missed"],
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
        {error ? (
          <EmptyState
            title="History is unavailable"
            action={
              <button onClick={refresh} className="secondary-button">
                Try again
              </button>
            }
          >
            Please retry shortly.
          </EmptyState>
        ) : isLoading ? (
          <div
            aria-label="Loading history"
            className="h-40 animate-pulse rounded-2xl bg-panel"
          />
        ) : history.length ? (
          <div className="overflow-hidden rounded-2xl border border-line bg-panel">
            {history.map((b) => (
              <Link
                key={b.id.toString()}
                href={`/circle/${b.circle}?view=commitments${b.status === Status.Met || b.status === Status.Crossed ? "&filter=history" : ""}`}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-5 transition last:border-0 hover:bg-panel-hi"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium leading-relaxed">
                    {b.description}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {circles.find(
                      (c) => c.address.toLowerCase() === b.circle.toLowerCase(),
                    )?.name || shortAddr(b.circle)}{" "}
                    ·{" "}
                    {new Date(Number(b.deadline) * 1000).toLocaleDateString(
                      [],
                      { month: "short", day: "numeric" },
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xs ${b.status === Status.Met ? "text-confirm" : b.status === Status.Crossed ? "text-forfeit" : "text-gold"}`}
                  >
                    {b.status === Status.Met
                      ? "Completed"
                      : b.status === Status.Crossed
                        ? "Missed"
                        : b.status === Status.PendingCosign
                          ? "In review"
                          : "In progress"}
                  </p>
                  <p className="tnum mt-2 text-xs text-muted">
                    {formatMon(b.stake)} MON →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No commitments in this view"
            action={
              <Link href="/" className="secondary-button">
                Find your Circle →
              </Link>
            }
          >
            Make a commitment with your Circle to begin your history.
          </EmptyState>
        )}
      </section>
      <details className="rounded-2xl border border-line p-5">
        <summary className="cursor-pointer text-sm text-muted">
          More about your progress
        </summary>
        <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {[
            ["Total committed", `${formatMon(stats.totalStake)} MON`],
            ["Missed", stats.failed],
            ["Circles joined", joined.length],
            ["Unique supporters", supporters.data?.toString() ?? "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-muted">{label}</p>
              <p className="tnum mt-2 text-lg">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs leading-relaxed text-muted">
          Completion rate includes settled commitments only: completed ÷
          (completed + missed). The streak counts consecutive completions
          ordered by deadline. Amounts come from escrow records. This history
          does not measure creditworthiness.
        </p>
      </details>
    </section>
  );
}
