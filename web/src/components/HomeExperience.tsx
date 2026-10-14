"use client";
import { useAccount } from "wagmi";
import { Dashboard } from "./Dashboard";
export function HomeExperience({ landing }: { landing: React.ReactNode }) {
  const { isConnected } = useAccount();
  return isConnected ? (
    <>
      <section className="pb-8 pt-10 sm:pt-12">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold">
          Your workspace
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Your Circles, in one place.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Pick up a conversation, check your commitments, or start a Circle.
        </p>
      </section>
      <div id="circles">
        <Dashboard />
      </div>
    </>
  ) : (
    landing
  );
}
