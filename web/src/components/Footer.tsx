import Link from "next/link";
import { Logo } from "./Logo";

/// Standard site footer. Keeps the brand voice — plain, a little wry — and
/// gathers the few real links the product has.
export function Footer() {
  return (
    <footer className="mt-20 border-t border-line pt-8 pb-4">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="font-display text-base font-semibold tracking-tight text-bone">
              Bondline
            </span>
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-linegrey">
            The chain remembers what your group chat forgets. Ship together, or
            fund together.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-widest text-faint">Product</span>
            <Link href="/" className="text-muted transition-colors hover:text-bone">
              Your Circles
            </Link>
            <Link href="/docs" className="text-muted transition-colors hover:text-bone">
              How it works
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-widest text-faint">Chain</span>
            <a
              href="https://testnet.monadexplorer.com"
              target="_blank"
              rel="noreferrer"
              className="text-muted transition-colors hover:text-bone"
            >
              Explorer ↗
            </a>
            <a
              href="https://faucet.monad.xyz"
              target="_blank"
              rel="noreferrer"
              className="text-muted transition-colors hover:text-bone"
            >
              Testnet faucet ↗
            </a>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-widest text-faint">Built for</span>
            <span className="text-muted">Spark on Monad</span>
            <span className="tnum text-faint">chain 10143</span>
          </div>
        </div>
      </div>

      <p className="tnum mt-8 text-[11px] text-faint">
        Bondline · every Circle its own vault, isolated on-chain · testnet build,
        test MON only, not audited
      </p>
    </footer>
  );
}
