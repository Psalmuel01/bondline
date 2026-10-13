import Link from "next/link";
import { Logo } from "./Logo";
import { githubUrl, socialUrl } from "@/lib/site";
import { monadMainnet } from "@/lib/chain";
const groups = [
  {
    title: "Product",
    links: [
      ["/#how-it-works", "How it works"],
      ["/docs/circles", "Circles & rewards"],
      ["/docs/verification", "Verification"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["/docs", "Documentation"],
      ["/docs/developers", "Developers"],
      [githubUrl, "GitHub"],
      ["/contact", "Contact"],
    ],
  },
  {
    title: "Trust",
    links: [
      ["/security", "Security"],
      ["/privacy", "Privacy"],
      ["/terms", "Terms"],
    ],
  },
];
export function Footer() {
  return (
    <footer className="mt-20 border-t border-line pb-6 pt-10">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-3 font-display text-lg font-semibold"
          >
            <Logo size={28} />
            Bondline
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-7 text-muted">
            Put money behind the promises you make. Follow through with your
            people.
          </p>
          {socialUrl && (
            <a
              href={socialUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-xs text-gold"
            >
              Follow Bondline ↗
            </a>
          )}
        </div>
        {groups.map((group) => (
          <nav key={group.title} aria-label={`Footer ${group.title}`}>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-faint">
              {group.title}
            </h2>
            <ul className="space-y-3">
              {group.links.map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-muted hover:text-bone"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap justify-between gap-3 border-t border-line pt-5 text-xs text-faint">
        <span>
          © {new Date().getFullYear()} Bondline · Small promises. Shared
          progress.
        </span>
        <a
          href={monadMainnet.blockExplorers.default.url}
          target="_blank"
          rel="noreferrer"
          className="hover:text-gold"
        >
          {monadMainnet.name} ↗
        </a>
      </div>
      <p className="mt-3 max-w-4xl text-[11px] leading-6 text-faint">
        {monadMainnet.testnet
          ? "Test MON has no cash value. "
          : "MON can fluctuate in value. "}
        Stakes can be forfeited. Contracts are not independently audited.
        Bondline is not a bank; reliability history is not a credit score.{" "}
        <Link href="/security" className="underline">
          Understand the risks.
        </Link>
      </p>
    </footer>
  );
}
