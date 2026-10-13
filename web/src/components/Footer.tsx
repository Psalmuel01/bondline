import Link from "next/link";
import { monadMainnet } from "@/lib/chain";
export function Footer() {
  return <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line py-6 text-xs text-muted"><p>Bondline <span className="mx-2 text-faint">·</span> Small promises. Shared progress.</p><nav aria-label="Footer" className="flex flex-wrap items-center gap-5"><Link href="/docs" className="hover:text-gold">How it works</Link><Link href="/analytics" className="hover:text-gold">Activity</Link><a href={monadMainnet.blockExplorers.default.url} target="_blank" rel="noreferrer" className="hover:text-gold">{monadMainnet.testnet ? "Monad testnet" : "Monad mainnet"} ↗</a></nav>{monadMainnet.testnet && <p className="w-full text-faint">Test MON has no cash value.</p>}</footer>;
}
