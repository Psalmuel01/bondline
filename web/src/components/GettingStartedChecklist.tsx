"use client";
import Link from "next/link";
import { OnboardingGuide } from "./OnboardingGuide";
export function GettingStartedChecklist({
  joined,
  committed,
  circleHref,
  onCreate,
  onDiscover,
}: {
  joined: boolean;
  committed: boolean;
  circleHref?: string;
  onCreate: () => void;
  onDiscover: () => void;
}) {
  if (committed) return null;
  const count = 1 + Number(joined);
  return (
    <section className="rounded-2xl border border-gold/25 bg-gold/5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-gold">
            Getting started · {count}/3 steps
          </p>
          <h2 className="font-display mt-3 text-2xl font-semibold">
            Your first promise starts here.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
            Choose something achievable, a stake you’re comfortable losing, and
            people who can review the result.
          </p>
        </div>
        <OnboardingGuide circleHref={circleHref} automatic />
      </div>
      <ol className="mt-6 grid gap-5 sm:grid-cols-3">
        {[
          [
            "Account ready",
            "Your passkey or wallet opens your signing account.",
            true,
          ],
          [
            "Find your Circle",
            "Start a group with a friend, or ask a member to invite you.",
            joined,
          ],
          [
            "Make a commitment",
            "Choose a goal, deadline, stake, and verification rule.",
            committed,
          ],
        ].map(([title, body, done], i) => (
          <li key={String(title)} className="border-t border-line pt-4">
            <p className="text-sm font-medium">
              <span className="mr-2 text-gold">{done ? "✓" : i + 1}</span>
              {title}
            </p>
            <p className="mt-2 text-xs leading-6 text-muted">{body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap gap-3">
        {joined && circleHref ? (
          <Link href={circleHref} className="primary-button">
            Open your Circle →
          </Link>
        ) : (
          <>
            <button className="primary-button" onClick={onCreate}>
              Create a Circle
            </button>
            <button className="secondary-button" onClick={onDiscover}>
              Explore existing Circles
            </button>
          </>
        )}
        <Link
          href="/docs/getting-started"
          className="self-center text-sm text-muted hover:text-gold"
        >
          Funding & first steps ↗
        </Link>
      </div>
    </section>
  );
}
