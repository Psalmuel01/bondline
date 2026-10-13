"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { CORE_ADDRESS, coreAbi, hasV2, Status } from "@/lib/contracts";
import { useBonds, useCircles, useNow } from "@/lib/hooks";
import { countdownParts } from "@/lib/format";
import { evidenceNotification } from "@/lib/review-notification";

export function NotificationCenter() {
  const { address } = useAccount();
  const { circles } = useCircles();
  const { bonds } = useBonds();
  const now = useNow();
  const [open, setOpen] = useState(false);
  const pending = useMemo(() => address ? bonds.filter((bond) => bond.status === Status.PendingCosign && bond.creator.toLowerCase() !== address.toLowerCase()) : [], [address, bonds]);
  const flags = useReadContracts({ contracts: pending.flatMap((bond) => [
    { address: CORE_ADDRESS, abi: coreAbi, functionName: "cosignState" as const, args: [bond.id] as const },
    { address: CORE_ADDRESS, abi: coreAbi, functionName: "hasResponded" as const, args: [bond.id, address!] as const },
    ...(hasV2 ? [{ address: CORE_ADDRESS, abi: coreAbi, functionName: "hasBacked" as const, args: [bond.id, address!] as const }] : []),
  ]), query: { enabled: !!address && pending.length > 0, refetchInterval: 10000, staleTime: 5000 } });
  const notifications = useMemo(() => {
    if (!address) return [];
    return bonds.flatMap((bond) => {
      const circle = circles.find((item) => item.address.toLowerCase() === bond.circle.toLowerCase());
      if (!circle) return [];
      const mine = bond.creator.toLowerCase() === address.toLowerCase();
      if (bond.status === Status.PendingCosign && !mine) {
        const index = pending.findIndex((item) => item.id === bond.id);
        const base = index * (hasV2 ? 3 : 2);
        const state = flags.data?.[base]?.result;
        const responded = flags.data?.[base + 1]?.result;
        const backed = hasV2 ? flags.data?.[base + 2]?.result : false;
        if (index < 0 || !Array.isArray(state) || typeof responded !== "boolean" || (hasV2 && typeof backed !== "boolean")) return [];
        const eligibleMembers = hasV2 ? circle.members.slice(0, Number(state[0]) + 1) : circle.members;
        const eligible = eligibleMembers.some((m) => m.toLowerCase() === address.toLowerCase());
        const title = evidenceNotification({ backed: backed === true, responded, eligible, closesAt: bond.cosignClosesAt, now });
        if (title) return [{ id: `review-${bond.id}`, circle, title, body: bond.description, tone: "text-gold" }];
      }
      if (bond.status === Status.Active && mine) {
        const countdown = countdownParts(bond.deadline, now);
        if (!countdown.expired && Number(bond.deadline) * 1000 - now < 86400000) return [{ id: `deadline-${bond.id}`, circle, title: `Deadline in ${countdown.text}`, body: bond.description, tone: "text-forfeit" }];
      }
      return [];
    });
  }, [address, bonds, circles, now, pending, flags.data]);
  return <div className="relative">
    <button onClick={() => setOpen((value) => !value)} aria-expanded={open} className="relative rounded-md p-2 text-muted transition hover:bg-panel hover:text-gold" aria-label={`Notifications${notifications.length ? `, ${notifications.length} need attention` : ""}`}><svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>{notifications.length > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gold ring-2 ring-bg"/>}</button>
    {open && <div className="fixed left-4 right-4 top-20 z-40 max-h-[70vh] w-auto overflow-y-auto rounded-xl border border-line bg-panel shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-80"><div className="flex items-center justify-between border-b border-line px-4 py-3"><span className="font-display text-sm font-semibold text-bone">Needs your attention</span><button aria-label="Close notifications" onClick={() => setOpen(false)} className="px-2 text-muted">×</button></div>{notifications.length === 0 ? <p className="px-4 py-8 text-center text-xs text-muted">Nothing needs you right now.</p> : notifications.map((item) => <Link onClick={() => setOpen(false)} key={item.id} href={`/circle/${item.circle.address}`} className="block border-b border-line px-4 py-3 transition hover:bg-panel-hi"><p className={`text-xs font-semibold ${item.tone}`}>{item.title}</p><p className="mt-1 truncate text-sm text-bone">{item.body}</p><p className="mt-1 text-xs text-muted">{item.circle.name}</p></Link>)}</div>}
  </div>;
}
