"use client";

import { isAddress, parseEther } from "viem";
import { hasV2 } from "@/lib/contracts";
import { useState } from "react";
import { useBondlineWrite } from "@/lib/useBondlineWrite";
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
  const [kind, setKind] = useState(0);
  const [target, setTarget] = useState("1");
  const [repo, setRepo] = useState("");
  const [author, setAuthor] = useState("");
  const [commits, setCommits] = useState(3);
  const verifier = process.env.NEXT_PUBLIC_EXTERNAL_VERIFIER_ADDRESS;
  const conditionValid = kind === 0 || (kind === 1 && /^\d+(\.\d{1,18})?$/.test(target) && Number(target) > 0) || (kind === 2 && !!verifier && isAddress(verifier) && /^[\w.-]+\/[\w.-]+$/.test(repo) && /^[a-zA-Z0-9-]{1,39}$/.test(author) && commits >= 1 && commits <= 100);

  const stakeNum = Number(stake);
  const canSubmit = description.trim().length > 0 && description.trim().length <= 280 && /^\d+(\.\d{1,18})?$/.test(stake) && stakeNum > 0 && stakeNum <= 1000000 && conditionValid;
  const busy = write.isPending || write.isConfirming;

  async function submit() {
    if (!canSubmit) return;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + hours * 3600);
    const hash = kind === 0
      ? await write.openBond(circle.address, description.trim(), deadline, stake)
      : await write.openVerifiedBond(circle.address, description.trim(), deadline, stake, kind, kind === 2 ? verifier as `0x${string}` : "0x0000000000000000000000000000000000000000", kind === 1 ? parseEther(target) : 0n, kind === 2 ? JSON.stringify({ type: "github", repo, author, commits }) : "");
    if (hash) { setDescription(""); setStake(""); }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-5">
      <span className="font-display text-sm font-semibold uppercase tracking-widest text-bone">
        Make a commitment
      </span>

      <input
        aria-label="Your commitment"
        maxLength={280}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Ship the landing page · Run the 10k · Send the invoices"
        className="rounded-md border border-line bg-bg px-3 py-2 text-sm text-bone outline-none focus:border-gold/50"
      />

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-widest text-faint">Due in</span>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.hours}
              onClick={() => setHours(p.hours)}
              className={`rounded-md border px-3 py-1.5 text-xs transition ${
                hours === p.hours
                  ? "border-gold/50 bg-gold/10 text-gold"
                  : "border-line text-muted hover:text-bone"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-widest text-faint">Stake (MON)</span>
        <input
          value={stake}
          onChange={(e) => setStake(e.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal"
          placeholder="0.5"
          className="tnum rounded-md border border-line bg-bg px-3 py-2 text-sm text-bone outline-none focus:border-gold/50"
        />
      </label>

      {hasV2 && <label className="flex flex-col gap-2 text-sm text-muted">
        How will we verify it?
        <select value={kind} onChange={(e) => setKind(Number(e.target.value))} className="rounded-lg border border-line bg-bg p-3 text-bone">
          <option value={0}>Circle reviews your evidence</option>
          <option value={1}>Automatic savings balance check</option>
          <option value={2} disabled={!verifier}>GitHub contributions {!verifier ? "(not configured)" : ""}</option>
        </select>
      </label>}
      {kind === 1 && <label className="text-sm text-muted">Account balance to reach (MON)<input aria-label="Balance target" value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" className="mt-2 w-full rounded-lg border border-line bg-bg p-3 text-bone" /><p className="mt-2 text-xs">Your available balance must reach this target before the deadline, after your stake is set aside. Temporary balances count; this checks a balance, not long-term savings.</p></label>}
      {kind === 2 && <div className="flex flex-col gap-2"><input aria-label="GitHub repository" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="owner/repository" className="rounded-lg border border-line bg-bg p-3" /><input aria-label="GitHub author" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="GitHub username" className="rounded-lg border border-line bg-bg p-3" /><label className="text-sm text-muted">Commits during this commitment<input aria-label="Required commits" type="number" min={1} max={100} value={commits} onChange={(e) => setCommits(Number(e.target.value))} className="ml-3 w-20 rounded-lg border border-line bg-bg p-2" /></label><p className="text-xs text-muted">Bondline&apos;s authorized verifier checks public repository commits by this author on its default branch. This measures repository activity; it does not prove ownership of a GitHub account.</p></div>}
      <div className="rounded-lg border border-gold/20 bg-gold/5 p-3 text-sm text-muted"><strong className="text-bone">Your money, explained.</strong> {stake || "Your stake"} MON is set aside in this Circle. Complete and verify before the deadline to get it back. If you miss it, your stake goes into {circle.name}&apos;s Pot. Weekly rewards go to members who complete commitments that week. Circle review allows 24 hours for friends to review evidence submitted before the deadline.</div>
      <button
        onClick={submit}
        disabled={!canSubmit || busy}
        className="w-full rounded-lg bg-gold px-3 py-2.5 text-sm font-semibold text-ink transition hover:brightness-108 disabled:opacity-40"
      >
        {busy ? "Confirming your commitment…" : "I’m in"}
      </button>

      {write.error && <p className="text-xs text-forfeit">{write.error}</p>}
      {write.hash && (
        <a
          href={explorerTx(write.hash)}
          target="_blank"
          rel="noreferrer"
          className="tnum text-xs text-gold underline decoration-dotted underline-offset-2"
        >
          {write.isConfirming ? "stake pending ↗" : "staked ↗"}
        </a>
      )}
    </div>
  );
}
