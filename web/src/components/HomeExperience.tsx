"use client";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Dashboard } from "./Dashboard";
import { ConnectButton } from "./ConnectButton";
export function HomeExperience() {
  const { isConnected } = useAccount();
  return (
    <>
      {isConnected ? (
        <section className="pb-8 pt-10 sm:pt-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-gold">
            A little accountability goes a long way
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Your people. Your next step.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
            Catch up with your Circle and keep the promises that matter.
          </p>
        </section>
      ) : (
        <section className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[.22em] text-gold">
              Accountability, together
            </p>
            <h1 className="font-display text-5xl font-semibold leading-[1.06] tracking-[-.045em] sm:text-6xl">
              Turn “I will”
              <br />
              into <span className="text-gold">“I did.”</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              A private space for your people, your goals, and a little skin in
              the game. Make a promise. Back each other. Follow through.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <ConnectButton />
              <Link href="/docs" className="text-sm text-muted hover:text-bone">
                See how it works ↗
              </Link>
            </div>
            <p className="mt-4 text-xs text-faint">
              One passkey to get started. No seed phrase or extension.
            </p>
          </div>
          <div className="relative overflow-hidden rounded-[28px] border border-gold/20 bg-gradient-to-br from-gold/10 via-panel to-panel p-7 sm:p-9">
            <div
              aria-hidden="true"
              className="mb-9 flex items-center -space-x-5"
            >
              <span className="h-24 w-24 rounded-full border-[12px] border-gold/70" />
              <span className="h-24 w-24 rounded-full border-[12px] border-confirm/70" />
              <span className="h-24 w-24 rounded-full border-[12px] border-bone/30" />
            </div>
            <h2 className="font-display text-2xl font-semibold">
              Small promises.
              <br />
              Shared progress.
            </h2>
            <ol className="mt-8 space-y-5">
              {[
                [
                  "01",
                  "Find your people",
                  "Create a Circle and invite friends.",
                ],
                [
                  "02",
                  "Put a goal on the line",
                  "Choose your deadline and a stake in MON.",
                ],
                [
                  "03",
                  "Show up for each other",
                  "Chat, share evidence, and celebrate follow-through.",
                ],
              ].map(([number, title, body]) => (
                <li key={number} className="flex gap-4">
                  <span className="tnum pt-1 text-xs text-gold">{number}</span>
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="mt-1 text-sm text-muted">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-7 border-t border-line pt-5 text-xs leading-relaxed text-muted">
              Verified completion returns your stake. Missed commitments fund
              your Circle’s shared Pot.
            </p>
          </div>
        </section>
      )}
      <div id="circles" className="scroll-mt-6">
        <Dashboard />
      </div>
    </>
  );
}
