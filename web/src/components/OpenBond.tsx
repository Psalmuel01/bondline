"use client";

import { isAddress, parseEther } from "viem";
import { hasV2 } from "@/lib/contracts";
import { useState } from "react";
import { useBondlineWrite } from "@/lib/useBondlineWrite";
import { requiredForBond } from "@/lib/threshold";
import { explorerTx } from "@/lib/chain";
import type { Circle } from "@/lib/contracts";

const PRESETS = [
  { label: "1 day", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "1 week", hours: 168 },
  { label: "2 weeks", hours: 336 },
];

/// Stake MON against a personal deadline inside a Circle. The stake is escrowed by
/// the Core; hit the deadline and get it back on a group vote, miss and it
/// funds the Circle's Pot.
export function OpenBond({
  circle,
  onCreated,
}: {
  circle: Circle;
  onCreated: () => void;
}) {
  const write = useBondlineWrite(onCreated);
  const [description, setDescription] = useState("");
  const [stake, setStake] = useState("");
  const [hours, setHours] = useState(72);
  const [customDeadline, setCustomDeadline] = useState("");
  const [kind, setKind] = useState(0);
  const [target, setTarget] = useState("1");
  const [repo, setRepo] = useState("");
  const [author, setAuthor] = useState("");
  const [commits, setCommits] = useState(3);
  const [reviewing, setReviewing] = useState(false);
  const [reviewDeadline, setReviewDeadline] = useState<bigint>();
  const verifier = process.env.NEXT_PUBLIC_EXTERNAL_VERIFIER_ADDRESS;
  const conditionValid =
    kind === 0 ||
    (kind === 1 &&
      /^\d+(\.\d{1,18})?$/.test(target) &&
      Number(target) > 0 &&
      Number(target) <= 1000000) ||
    (kind === 2 &&
      !!verifier &&
      isAddress(verifier) &&
      /^[\w.-]+\/[\w.-]+$/.test(repo) &&
      /^[a-zA-Z0-9-]{1,39}$/.test(author) &&
      Number.isInteger(commits) &&
      commits >= 1 &&
      commits <= 100);

  const stakeNum = Number(stake);
  const customTimestamp = customDeadline
    ? Math.floor(new Date(customDeadline).getTime() / 1000)
    : undefined;
  const deadlineValid =
    customTimestamp === undefined ||
    (Number.isFinite(customTimestamp) &&
      customTimestamp > Date.now() / 1000 &&
      customTimestamp <= Date.now() / 1000 + 30 * 86400);
  const goalBytes = new TextEncoder().encode(description.trim()).length;
  const canSubmit =
    description.trim().length > 0 &&
    goalBytes <= 280 &&
    deadlineValid &&
    /^\d+(\.\d{1,18})?$/.test(stake) &&
    stakeNum > 0 &&
    stakeNum <= 1000000 &&
    conditionValid;
  const busy = write.isPending || write.isConfirming;

  async function submit() {
    if (!canSubmit || busy) return;
    const deadline = reviewDeadline;
    if (!deadline || deadline <= BigInt(Math.floor(Date.now() / 1000))) {
      setReviewing(false);
      return;
    }
    await (kind === 0
      ? write.openBond(circle.address, description.trim(), deadline, stake)
      : write.openVerifiedBond(
          circle.address,
          description.trim(),
          deadline,
          stake,
          kind,
          kind === 2
            ? (verifier as `0x${string}`)
            : "0x0000000000000000000000000000000000000000",
          kind === 1 ? parseEther(target) : 0n,
          kind === 2
            ? JSON.stringify({ type: "github", repo, author, commits })
            : "",
        ));
    // Keep the reviewed details visible until the confirmed receipt closes the dialog.
  }

  const verificationLabel =
    kind === 0
      ? "Your Circle reviews evidence"
      : kind === 1
        ? `Account balance reaches ${target} MON`
        : `${commits} commits by ${author} in ${repo}`;
  return (
    <div className="p-6 sm:p-8">
      <div className="mb-7 flex items-center gap-3 text-xs">
        <span className={reviewing ? "text-muted" : "font-semibold text-gold"}>
          1 · Your commitment
        </span>
        <span className="text-faint">→</span>
        <span className={reviewing ? "font-semibold text-gold" : "text-muted"}>
          2 · Review & confirm
        </span>
      </div>
      {!reviewing ? (
        <div className="space-y-6">
          <div>
            <h3 className="font-display text-2xl font-semibold">
              What will you follow through on?
            </h3>
            <p className="mt-2 text-sm text-muted">
              Make it specific enough that your Circle knows when you’ve done
              it.
            </p>
          </div>
          <label className="block text-sm font-medium">
            Your goal
            <textarea
              maxLength={280}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Run three times this week, or ship the first version of my project…"
              className="product-field mt-2 resize-none"
            />
            <span className="mt-1 block text-right text-xs font-normal text-faint">
              {description.length}/280
            </span>
          </label>
          {goalBytes > 280 && (
            <p role="alert" className="text-xs text-forfeit">
              This goal is too long. Shorten it before continuing; some
              characters take more space.
            </p>
          )}
          <fieldset>
            <legend className="mb-3 text-sm font-medium">
              Give yourself a deadline
            </legend>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.hours}
                  aria-pressed={!customDeadline && hours === p.hours}
                  onClick={() => {
                    setHours(p.hours);
                    setCustomDeadline("");
                  }}
                  className={`min-h-12 rounded-xl border text-sm ${!customDeadline && hours === p.hours ? "border-gold/50 bg-gold/10 text-gold" : "border-line text-muted"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-xs text-muted">
              Or choose an exact date and time
              <input
                type="datetime-local"
                value={customDeadline}
                onChange={(e) => setCustomDeadline(e.target.value)}
                className="product-field mt-2"
              />
            </label>
            {!deadlineValid && (
              <p role="alert" className="mt-2 text-xs text-forfeit">
                Choose a future date within the next 30 days.
              </p>
            )}
          </fieldset>
          <label className="block text-sm font-medium">
            Your stake <span className="font-normal text-muted">in MON</span>
            <input
              value={stake}
              onChange={(e) => setStake(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder="0.5"
              className="product-field tnum mt-2"
            />
            <span className="mt-2 block text-xs font-normal text-muted">
              Choose an amount you’re comfortable putting on the line. Gas is
              paid separately.
            </span>
            {stake &&
              !(
                /^\d+(\.\d{1,18})?$/.test(stake) &&
                stakeNum > 0 &&
                stakeNum <= 1000000
              ) && (
                <span className="mt-2 block text-xs text-forfeit">
                  Enter a positive amount, up to 1,000,000 MON, with at most 18
                  decimal places.
                </span>
              )}
          </label>
          {hasV2 && (
            <label className="block text-sm font-medium">
              How is completion verified?
              <select
                value={kind}
                onChange={(e) => setKind(Number(e.target.value))}
                className="product-field mt-2"
              >
                <option value={0}>Circle reviews your evidence</option>
                <option value={1}>Automatic account balance check</option>
                {verifier && <option value={2}>GitHub contributions</option>}
              </select>
            </label>
          )}
          {kind === 1 && (
            <label className="block text-sm font-medium">
              Balance to reach (MON)
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                inputMode="decimal"
                className="product-field mt-2"
              />
              <span className="mt-2 block text-xs font-normal text-muted">
                Available balance after staking. This checks a balance, not how
                long you saved it.
              </span>
            </label>
          )}
          {kind === 2 && (
            <div className="space-y-4">
              <label className="block text-sm">
                Public repository
                <input
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="owner/repository"
                  className="product-field mt-2"
                />
              </label>
              <label className="block text-sm">
                GitHub author
                <input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="username"
                  className="product-field mt-2"
                />
              </label>
              <label className="block text-sm">
                Required commits
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={commits}
                  onChange={(e) => setCommits(Number(e.target.value))}
                  className="product-field mt-2"
                />
              </label>
              <p className="text-xs leading-relaxed text-muted">
                The authorized verifier checks this author’s public commits on
                the default branch. This does not verify ownership of a GitHub
                account.
              </p>
            </div>
          )}
          <button
            disabled={!canSubmit || busy}
            onClick={() => {
              setReviewDeadline(
                BigInt(
                  customTimestamp ??
                    Math.floor(Date.now() / 1000) + hours * 3600,
                ),
              );
              setReviewing(true);
            }}
            className="primary-button w-full"
          >
            Review commitment →
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="font-display text-2xl font-semibold">
              A promise worth keeping.
            </h3>
            <p className="mt-2 text-sm text-muted">
              Review your commitment before confirming with your account.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-bg p-5">
            <p className="text-xs text-gold">{circle.name}</p>
            <p className="mt-3 break-words text-lg font-medium leading-relaxed">
              {description.trim()}
            </p>
            <dl className="mt-5 space-y-4 border-t border-line pt-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Stake</dt>
                <dd className="tnum">{stake} MON</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Deadline</dt>
                <dd className="text-right">
                  {reviewDeadline &&
                    new Date(Number(reviewDeadline) * 1000).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Verification</dt>
                <dd className="mt-1">{verificationLabel}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-xl bg-gold/5 p-4 text-sm leading-relaxed text-muted">
            <p>
              <strong className="text-bone">Complete and verify:</strong> your
              stake returns to you.
            </p>
            <p className="mt-2">
              <strong className="text-bone">Miss the deadline:</strong> your
              stake funds the Circle’s Pot.
            </p>
            {kind === 0 && (
              <p className="mt-2">
                Submit evidence before the deadline. Your Circle then has 24
                hours to review it;{" "}
                {requiredForBond(
                  circle.members.length,
                  circle.cosignThresholdBps,
                )}{" "}
                {requiredForBond(
                  circle.members.length,
                  circle.cosignThresholdBps,
                ) === 1
                  ? "approval is"
                  : "approvals are"}{" "}
                required.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              disabled={busy}
              onClick={() => setReviewing(false)}
              className="secondary-button"
            >
              Edit
            </button>
            <button
              disabled={!canSubmit || busy}
              onClick={submit}
              className="primary-button flex-1"
            >
              {write.isPending
                ? "Confirm with your account…"
                : write.isConfirming
                  ? "Waiting for confirmation…"
                  : `Confirm · ${stake} MON`}
            </button>
          </div>
          <p className="text-center text-xs text-faint">
            This creates an on-chain commitment. A gas fee applies.
          </p>
        </div>
      )}
      {write.error && (
        <p role="alert" className="mt-4 text-sm text-forfeit">
          {write.error}
        </p>
      )}
      {write.hash && (
        <a
          href={explorerTx(write.hash)}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block text-xs text-gold"
        >
          {write.isConfirming
            ? "View pending transaction ↗"
            : "View transaction ↗"}
        </a>
      )}
    </div>
  );
}
