"use client";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import {
  CORE_ADDRESS,
  coreAbi,
  hasV2,
  Status,
  type Bond,
  type Circle,
} from "@/lib/contracts";
import { useBondlineWrite } from "@/lib/useBondlineWrite";
import { formatMon, shortAddr } from "@/lib/format";
import { Avatar } from "./Avatar";
import { useProfiles } from "@/lib/useProfiles";

export function useVerification(id: bigint) {
  const query = useReadContracts({
    contracts: [
      {
        address: CORE_ADDRESS,
        abi: coreAbi,
        functionName: "verification",
        args: [id],
      },
    ],
    query: { enabled: hasV2, refetchInterval: 15000 },
  });
  return query.data?.[0]?.result;
}
export function CommitmentSignals({
  bond,
  circle,
  onChange,
}: {
  bond: Bond;
  circle: Circle;
  onChange: () => void;
}) {
  const { address } = useAccount();
  const verification = useVerification(bond.id);
  const backingCount = useReadContract({
    address: CORE_ADDRESS,
    abi: coreAbi,
    functionName: "backerCount",
    args: [bond.id],
    query: { enabled: hasV2, refetchInterval: 10000 },
  });
  const query = useReadContracts({
    contracts: circle.members.map((member) => ({
      address: CORE_ADDRESS,
      abi: coreAbi,
      functionName: "hasBacked" as const,
      args: [bond.id, member] as const,
    })),
    query: { enabled: hasV2, refetchInterval: 10000 },
  });
  const write = useBondlineWrite(() => {
    void query.refetch();
    void backingCount.refetch();
    onChange();
  });
  const { names } = useProfiles(circle.members);
  if (!hasV2) return null;
  const count = Number(backingCount.data ?? 0);
  const supporters = circle.members.filter(
    (_, index) => query.data?.[index]?.result === true,
  );
  const myIndex = circle.members.findIndex(
    (m) => m.toLowerCase() === address?.toLowerCase(),
  );
  const backed = myIndex >= 0 ? query.data?.[myIndex]?.result : false;
  const kind = verification?.[0];
  const active =
    bond.status === Status.Active && Number(bond.deadline) * 1000 > Date.now();
  const canBack =
    active &&
    address &&
    address.toLowerCase() !== bond.creator.toLowerCase() &&
    myIndex >= 0;
  const busy = write.isPending || write.isConfirming;
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <p className="text-xs text-muted">
        {count} {count === 1 ? "supporter" : "supporters"} ·{" "}
        {kind === undefined
          ? "Loading verification…"
          : kind === 0
            ? "Circle evidence review"
            : kind === 1
              ? `Balance target: ${formatMon(verification![2])} MON`
              : "GitHub · authorized verifier"}
      </p>
      {supporters.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-2"
          aria-label="Commitment supporters"
        >
          {supporters.map((member) => (
            <span
              key={member}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-1 text-xs text-muted"
            >
              <Avatar addr={member} size={22} />
              <span>{names[member.toLowerCase()] || shortAddr(member)}</span>
            </span>
          ))}
        </div>
      )}
      {backed === true && (
        <p className="text-xs text-confirm">You backed this commitment.</p>
      )}
      {canBack && backed !== true && (
        <p className="text-xs text-muted">
          A little encouragement. Evidence is reviewed separately.
        </p>
      )}
      {canBack && (
        <button
          disabled={busy || backed === undefined || backed === true}
          onClick={() => write.backCommitment(bond.id)}
          className="rounded-lg border border-confirm/40 bg-confirm/10 p-2 text-sm text-confirm disabled:opacity-50"
        >
          {backed ? "You backed this" : busy ? "Confirming…" : "Back them"}
        </button>
      )}
      {active && kind === 1 && (
        <button
          disabled={busy || !address}
          onClick={() => write.verifyBalance(bond.id)}
          className="rounded-lg border border-gold/40 p-2 text-sm text-gold"
        >
          {busy ? "Checking…" : "Check progress & return stake"}
        </button>
      )}
      {active && kind === 2 && (
        <p className="text-xs text-faint">
          The verifier checks your repository automatically. Keep the required
          commits on its default branch before this deadline.
        </p>
      )}
      {write.error && (
        <p role="alert" className="text-xs text-forfeit">
          {write.error}
        </p>
      )}
    </div>
  );
}
