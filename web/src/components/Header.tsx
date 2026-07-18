import Link from "next/link";
import { ConnectButton } from "./ConnectButton";

export function Header() {
  return (
    <header className="flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-live/40 bg-live/10 text-live">
          <span className="text-sm font-bold">⌇</span>
        </div>
        <span className="text-lg font-semibold tracking-tight">Bondline</span>
        <span className="tnum ml-1 rounded border border-line px-1.5 py-0.5 text-[10px] text-faint">
          MONAD TESTNET
        </span>
      </Link>
      <ConnectButton />
    </header>
  );
}
