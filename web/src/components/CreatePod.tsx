"use client";

import { useMemo, useState } from "react";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import { useBondlineWrite } from "@/lib/useBondlineWrite";
import { bpsToPct, thresholdSentence } from "@/lib/threshold";
import { explorerTx } from "@/lib/chain";
import { shortAddr } from "@/lib/format";
import { Avatar } from "./Avatar";

/// Create-pod flow. Collects a name, the member set (creator auto-included), and
/// an approval threshold, with a live sentence spelling out what the threshold
/// means for this exact group before anything is signed.
export function CreatePod({ onCreated }: { onCreated: () => void }) {
  const { address } = useAccount();
  const write = useBondlineWrite(onCreated);

  const [name, setName] = useState("");
  const [raw, setRaw] = useState(""); // one address per line
  const [bps, setBps] = useState(5000);

  // creator is always a member; parse the rest from the textarea
  const parsed = useMemo(() => {
    const others = raw
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const all: `0x${string}`[] = [];
    const seen = new Set<string>();
    const invalid: string[] = [];
    if (address) {
      all.push(address);
      seen.add(address.toLowerCase());
    }
    for (const o of others) {
      if (!isAddress(o)) {
        invalid.push(o);
        continue;
      }
      const lo = o.toLowerCase();
      if (seen.has(lo)) continue; // silently dedupe (incl. creator)
      seen.add(lo);
      all.push(o as `0x${string}`);
    }
    return { members: all, invalid };
  }, [raw, address]);

  const memberCount = parsed.members.length;
  const canSubmit =
    !!address &&
    name.trim().length > 0 &&
    memberCount >= 2 &&
    parsed.invalid.length === 0;
  const busy = write.isPending || write.isConfirming;

  async function submit() {
    if (!canSubmit) return;
    await write.createPod(name.trim(), parsed.members, bps);
  }

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-line bg-panel p-6">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight text-bone">
          Start a Circle
        </h2>
        <p className="mt-1 text-xs text-faint">
          A Circle is your crew and your shared Pot. Crossed Bonds pile up here;
          the group cosigns to spend them.
        </p>
      </div>

      {!address && (
        <p className="rounded-md border border-gold/30 bg-gold/5 p-3 text-xs text-gold">
          Connect your wallet — you&apos;ll be the first member.
        </p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-widest text-faint">Circle name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Cabo 2026 · Marathon crew · Q1 shippers"
          className="rounded-md border border-line bg-bg px-3 py-2 text-sm text-bone outline-none focus:border-gold/50"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-widest text-faint">
          The crew — one address per line
        </span>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={4}
          placeholder={"0xabc…\n0xdef…"}
          className="tnum rounded-md border border-line bg-bg px-3 py-2 text-sm text-bone outline-none focus:border-gold/50"
        />
        {parsed.invalid.length > 0 && (
          <span className="text-xs text-forfeit">
            Not valid addresses: {parsed.invalid.map((s) => `"${s.slice(0, 10)}…"`).join(", ")}
          </span>
        )}
      </label>

      {/* member preview */}
      {memberCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {parsed.members.map((m) => (
            <div key={m} className="flex items-center gap-1.5">
              <Avatar addr={m} size={28} you={m.toLowerCase() === address?.toLowerCase()} />
              <span className="tnum text-xs text-muted">
                {shortAddr(m)}
                {m.toLowerCase() === address?.toLowerCase() && " (you)"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* threshold slider */}
      <label className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-faint">
            Cosign threshold
          </span>
          <span className="tnum text-sm font-semibold text-gold">{bpsToPct(bps)}%</span>
        </div>
        <input
          type="range"
          min={1000}
          max={10000}
          step={500}
          value={bps}
          onChange={(e) => setBps(Number(e.target.value))}
          className="accent-gold"
        />
        <span className="text-xs text-muted">{thresholdSentence(memberCount, bps)}</span>
      </label>

      <button
        onClick={submit}
        disabled={!canSubmit || busy}
        className="w-full rounded-lg bg-gold px-3 py-2.5 text-sm font-semibold text-ink transition hover:brightness-108 disabled:opacity-40"
      >
        {busy ? "Deploying your Circle on-chain…" : "Deploy Circle"}
      </button>

      {write.error && <p className="text-xs text-forfeit">{write.error}</p>}
      {write.hash && (
        <a
          href={explorerTx(write.hash)}
          target="_blank"
          rel="noreferrer"
          className="tnum text-xs text-gold underline decoration-dotted underline-offset-2"
        >
          {write.isConfirming ? "deploy pending ↗" : "Circle deployed ↗"}
        </a>
      )}
    </div>
  );
}
