import Link from "next/link";
import { ChatPreview } from "./ChatPreview";
import { StartCTA } from "./StartCTA";
import { FAQ } from "./FAQ";

export function PublicLanding() {
  return (
    <div className="compact-landing space-y-16 pb-8 sm:space-y-20">
      <section
        id="get-started"
        className="landing-hero relative isolate grid items-center gap-12 py-14 sm:py-20 lg:min-h-[650px] lg:grid-cols-[1.1fr_1fr]"
      >
        <div className="perspective-world" aria-hidden="true">
          <div className="perspective-grid" />
          <span className="grid-beacon" />
          <span className="grid-star star-one" />
          <span className="grid-star star-two" />
        </div>
        <div className="hero-copy">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-gold">
            Your word. Your people. Something at stake.
          </p>
          <h1 className="font-display mt-5 text-4xl font-semibold leading-[1.06] tracking-[-.045em] sm:text-6xl">
            Put money behind
            <br className="hidden sm:block" /> the promises
            <br className="hidden sm:block" />{" "}
            <span className="text-gold">you make.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-muted sm:text-lg">
            Make a commitment. Stake on yourself. Let your friends help you
            follow through.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <StartCTA />
            <Link href="#how-it-works" className="secondary-button">
              See how it works ↗
            </Link>
          </div>
          <p className="mt-4 text-xs text-faint">
            One passkey. No seed phrase. No extension.
          </p>
        </div>
        <ChatPreview />
      </section>
      <section id="how-it-works" className="scroll-mt-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Less “one day.” More “done.”
          </h2>
          <Link href="/guide" className="text-sm text-gold">
            The full walkthrough →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["01", "Commit", "Pick a clear goal, deadline, and stake."],
            ["02", "Get backed", "Your Circle cheers you on and checks in."],
            [
              "03",
              "Prove it",
              "Share evidence or meet your chosen verification rule.",
            ],
            [
              "04",
              "Settle",
              "Success releases your stake. Failure funds your Circle’s Pot.",
            ],
          ].map(([n, title, body]) => (
            <div
              key={n}
              className="mechanic-card rounded-2xl border border-line bg-panel/75 p-5"
            >
              <span className="tnum text-xs text-gold">{n}</span>
              <h3 className="font-display mt-5 text-lg font-semibold">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>
      <section
        id="circles"
        className="scroll-mt-8 grid gap-8 rounded-3xl border border-line bg-panel/60 p-7 sm:p-9 md:grid-cols-[1.1fr_1fr]"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">
            Made for your people
          </p>
          <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight">
            A group chat with follow-through.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-7 text-muted">
            Check in, back a friend, and review the evidence together. Every
            settled goal builds a record. Failed stakes fund weekly rewards for
            completed commitments.
          </p>
          <Link
            href="/docs/circles"
            className="mt-5 inline-block text-sm text-gold"
          >
            How Circles and rewards work →
          </Link>
        </div>
        <div
          className="flex flex-col justify-center gap-3"
          aria-label="Example goals"
        >
          {[
            ["↗", "Ship that side project", "Builders"],
            ["◎", "Finish your first 10K", "Friends"],
            ["✳", "Complete the course", "Study crew"],
          ].map(([icon, goal, tag]) => (
            <div
              key={goal}
              className="goal-strip flex items-center gap-4 rounded-xl border border-line bg-bg/60 p-4"
            >
              <span aria-hidden="true" className="text-xl text-gold">
                {icon}
              </span>
              <p className="flex-1 text-sm">{goal}</p>
              <span className="text-[10px] text-faint">{tag}</span>
            </div>
          ))}
          <p className="text-[10px] text-faint">
            Example goals · choose an available verification method.
          </p>
        </div>
      </section>
      <section
        id="verification"
        className="scroll-mt-8 flex flex-wrap items-center justify-between gap-5 border-y border-line py-6"
      >
        <div>
          <h2 className="font-display text-xl font-semibold">
            Clear rules. Visible outcomes.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Circle evidence review and MON balance checks are available. GitHub
            needs a configured verifier worker. Your history measures
            follow-through, not creditworthiness.
          </p>
        </div>
        <Link href="/docs/verification" className="text-sm text-gold">
          Verification guide →
        </Link>
      </section>
      <FAQ compact />
      <section className="flex flex-wrap items-center justify-between gap-6 border-t border-line pt-8">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Make your next promise count.
          </h2>
          <p className="mt-3 text-sm text-muted">
            A small goal. A little stake. Your people.
          </p>
        </div>
        <StartCTA />
      </section>
    </div>
  );
}
