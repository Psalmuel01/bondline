"use client";
import { guidanceVideoUrl } from "@/lib/site";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { usePreferences } from "@/lib/usePreferences";
import { Modal } from "./ui/Modal";
const lessons = [
  {
    title: "Make a promise you can prove.",
    body: "A commitment is a specific goal with a deadline and a rule for completion. Your Circle can understand what you intend to do and how you will show it.",
  },
  {
    title: "Choose a stake you can afford to lose.",
    body: "MON is set aside when you create the commitment. Verified success releases it; a missed commitment can forfeit it. Fees are separate. Start small.",
  },
  {
    title: "Choose your people.",
    body: "Circles combine a private conversation, goals, and a shared Pot. Create a Circle with at least one friend or accept an invitation from an existing member.",
  },
  {
    title: "Know the failed path.",
    body: "If you miss the deadline or the evidence fails review, your stake funds your Circle’s Pot. In v2, failed stakes support weekly rewards for completed commitments. There is no cancellation after creation.",
  },
  {
    title: "Ready for your first commitment?",
    body: "Open your Circle, choose Make a commitment, and review the goal, exact deadline, stake, and verification rule before you confirm. Friends can back the goal; evidence is approved separately.",
  },
];
export function OnboardingGuide({
  circleHref,
  automatic = false,
}: {
  circleHref?: string;
  automatic?: boolean;
}) {
  const { address } = useAccount();
  const { preferences, ready, update } = usePreferences();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (automatic && address && ready && !preferences.introSeen) setOpen(true);
  }, [automatic, address, ready, preferences.introSeen]);
  function close() {
    setOpen(false);
    update({ introSeen: true });
  }
  return (
    <>
      <button
        className="secondary-button"
        onClick={() => {
          setStep(0);
          setOpen(true);
        }}
      >
        Take the product guide →
      </button>
      <Modal open={open} onClose={close} title="Your first commitment">
        <div className="p-6 sm:p-8">
          <div
            className="mb-7 flex gap-1.5"
            aria-label={`Step ${step + 1} of ${lessons.length}`}
          >
            {lessons.map((_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full ${i <= step ? "bg-gold" : "bg-line"}`}
              />
            ))}
          </div>
          <p className="text-xs font-medium text-gold">
            {step + 1} of {lessons.length}
          </p>
          <h3 className="font-display mt-3 text-2xl font-semibold">
            {lessons[step].title}
          </h3>
          <p className="mt-4 text-base leading-8 text-muted">
            {lessons[step].body}
          </p>
          <div className="mt-7 flex gap-3">
            {step > 0 && (
              <button
                className="secondary-button"
                onClick={() => setStep((v) => v - 1)}
              >
                Back
              </button>
            )}
            {step < lessons.length - 1 ? (
              <button
                className="primary-button flex-1"
                onClick={() => setStep((v) => v + 1)}
              >
                Continue →
              </button>
            ) : (
              <Link
                href={circleHref || "/app/circles"}
                onClick={close}
                className="primary-button flex-1"
              >
                {circleHref ? "Open your Circle →" : "Find your Circle →"}
              </Link>
            )}
          </div>
          <Link
            href={guidanceVideoUrl || "/guide"}
            onClick={close}
            className="mt-5 inline-block text-xs text-muted hover:text-gold"
          >
            {guidanceVideoUrl
              ? "Watch the product walkthrough"
              : "Read the complete walkthrough"}
          </Link>
        </div>
      </Modal>
    </>
  );
}
