"use client";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className="mx-auto w-full max-w-2xl px-5 py-16">
      <EmptyState
        title="Something interrupted this page"
        action={
          <div className="flex flex-wrap gap-3">
            <button className="primary-button" onClick={reset}>
              Try again
            </button>
            <Link className="secondary-button" href="/">
              Return home
            </Link>
          </div>
        }
      >
        An unavailable page does not change your on-chain commitments. Try
        again, or return to your dashboard.
      </EmptyState>
      <Link
        href="/contact"
        className="mt-6 block text-center text-sm text-gold"
      >
        Get help →
      </Link>
    </main>
  );
}
