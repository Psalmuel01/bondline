"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "./ConnectButton";
import { Wordmark } from "./Logo";
import { NotificationCenter } from "./NotificationCenter";

export function Header() {
  const { isConnected } = useAccount();
  const pathname = usePathname();
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-4 border-b border-line/70 pb-5">
      <Link href="/" aria-label="Bondline home" className="shrink-0 transition-opacity hover:opacity-80">
        <Wordmark size={32} />
      </Link>
      <div className="ml-auto flex items-center gap-3 sm:gap-5">
        {!isConnected && <Link href="/docs" className="hidden text-sm text-muted transition-colors hover:text-bone sm:block">How it works</Link>}
        {isConnected && <NotificationCenter />}
        <ConnectButton />
      </div>
      {isConnected && <nav aria-label="Main navigation" className="flex w-full items-center gap-6 text-sm">
        {[ ["/", "Circles"], ["/profile", "Your history"] ].map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={pathname === href ? "font-medium text-gold" : "text-muted transition-colors hover:text-bone"}>{label}</Link>)}
      </nav>}
    </header>
  );
}
