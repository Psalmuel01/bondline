"use client";

import { useState } from "react";
import type { Circle } from "@/lib/contracts";

export function CircleShare({ circle }: { circle: Circle }) {
  const [copied, setCopied] = useState(false);
  const title = `${circle.name || "This Circle"} on Bondline`;
  const text = "See what this Circle is putting on the Line.";

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch (error) {
      // A cancelled native share is not an error the member needs to see.
      if (error instanceof DOMException && error.name === "AbortError") return;
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-bg/50 text-muted transition hover:border-gold/40 hover:text-gold"
      aria-label={copied ? "Circle link copied" : "Share this Circle"}
      title={copied ? "Link copied" : "Share Circle"}
    >
      {copied ? (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="m5 12 4 4L19 6" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-2"><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" /></svg>
      )}
    </button>
  );
}
