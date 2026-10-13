"use client";
import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { CORE_ADDRESS, coreAbi, hasV2 } from "@/lib/contracts";
import { useBondlineWrite } from "@/lib/useBondlineWrite";
export function TesterPanel() {
  const { address } = useAccount();
  const [feedback, setFeedback] = useState("");
  const query = useReadContract({
    address: CORE_ADDRESS,
    abi: coreAbi,
    functionName: "isTester",
    args: [address ?? CORE_ADDRESS],
    query: { enabled: hasV2 && !!address },
  });
  const write = useBondlineWrite(() => {
    void query.refetch();
  });
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          { recordedAt: new Date().toISOString(), feedback },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bondline-feedback.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  if (!hasV2) return null;
  return (
    <section className="my-6 rounded-xl border border-line bg-panel p-5">
      <h2 className="font-display text-lg text-bone">
        Help make promises stick.
      </h2>
      <p className="my-3 text-sm text-muted">
        Join the product test, then create a commitment, invite a friend, cosign
        their goal, and finish your verification. Your account&apos;s test
        activity will be counted publicly on testnet. Opt-in enrollment counts
        accounts, not proven unique people. Controlled accounts must be excluded
        from any claim about real testers.
      </p>
      <button
        disabled={
          !address ||
          query.data === undefined ||
          query.data ||
          write.isPending ||
          write.isConfirming
        }
        onClick={() => write.joinTesterCohort()}
        className="rounded-lg bg-gold px-4 py-2 text-sm text-ink disabled:opacity-40"
      >
        {query.data
          ? "You’re in the tester cohort"
          : write.isPending || write.isConfirming
            ? "Confirming…"
            : "Join the test"}
      </button>
      {write.error && (
        <p role="alert" className="mt-2 text-xs text-forfeit">
          {write.error}
        </p>
      )}
      <label className="mt-5 block text-xs text-muted">
        What was confusing or useful? (No names or account details needed.)
        <textarea
          aria-label="Anonymous tester feedback"
          maxLength={2000}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="mt-2 min-h-20 w-full rounded-lg border border-line bg-bg p-3 text-sm text-bone"
        />
      </label>
      <button
        onClick={download}
        disabled={!feedback.trim()}
        className="mt-2 text-sm text-gold disabled:opacity-40"
      >
        Save anonymous feedback
      </button>
      <p className="mt-2 text-xs text-faint">
        Download your feedback and share it with the organizer. It is not
        uploaded automatically.
      </p>
    </section>
  );
}
