"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Status } from "@/lib/contracts";
import { useBonds, useCircles, useNow } from "@/lib/hooks";
import { countdownParts } from "@/lib/format";

export function NotificationCenter() {
  const { address } = useAccount(); const { circles } = useCircles(); const { bonds } = useBonds(); const now = useNow(); const [open, setOpen] = useState(false);
  const notifications = useMemo(() => { if (!address) return []; return bonds.flatMap((bond) => { const circle = circles.find((item) => item.address.toLowerCase() === bond.circle.toLowerCase()); if (!circle) return []; const mine = bond.creator.toLowerCase() === address.toLowerCase(); const member = circle.members.some((item) => item.toLowerCase() === address.toLowerCase()); if (bond.status === Status.PendingCosign && member && !mine) return [{ circle, title: "Your cosign is needed", body: bond.description, tone: "text-gold" }]; if (bond.status === Status.Active && mine) { const countdown = countdownParts(bond.deadline, now); if (!countdown.expired && Number(bond.deadline) * 1000 - now < 86_400_000) return [{ circle, title: `Deadline in ${countdown.text}`, body: bond.description, tone: "text-forfeit" }]; } return []; }); }, [address, bonds, circles, now]);
  return <div className="relative"><button onClick={() => setOpen((value) => !value)} className="relative rounded-md p-2 text-muted transition hover:bg-panel hover:text-bone" aria-label="Notifications">⌁{notifications.length > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-gold" />}</button>{open && <div className="absolute right-0 top-11 z-40 w-80 overflow-hidden rounded-xl border border-line bg-panel shadow-2xl"><div className="flex items-center justify-between border-b border-line px-4 py-3"><span className="font-display text-sm font-semibold text-bone">On your Line</span><span className="tnum text-[10px] text-faint">{notifications.length} open</span></div>{notifications.length === 0 ? <p className="px-4 py-8 text-center text-xs text-faint">Nothing needs you right now.</p> : notifications.map((notification) => <Link onClick={() => setOpen(false)} key={`${notification.title}-${notification.circle.address}`} href={`/circle/${notification.circle.address}`} className="block border-b border-line px-4 py-3 transition hover:bg-panel-hi"><p className={`text-xs font-semibold ${notification.tone}`}>{notification.title}</p><p className="mt-1 truncate text-sm text-bone">{notification.body}</p><p className="mt-1 text-xs text-faint">{notification.circle.name}</p></Link>)}</div>}</div>;
}
