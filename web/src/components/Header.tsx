import Link from "next/link";
import { ConnectButton } from "./ConnectButton";
import { Wordmark } from "./Logo";
import { NotificationCenter } from "./NotificationCenter";

export function Header() {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-5">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Wordmark size={30} />
        </Link>
        <span className="tnum hidden rounded border border-line px-1.5 py-0.5 text-[10px] tracking-wide text-faint sm:inline">
          MONAD TESTNET
        </span>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-4">
        <Link
          href="/docs"
          className="hidden px-2 text-sm text-muted transition-colors hover:text-bone sm:inline"
        >
          How it works
        </Link>
        <NotificationCenter />
        <ConnectButton />
      </div>
    </header>
  );
}
