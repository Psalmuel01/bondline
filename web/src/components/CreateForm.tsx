"use client";

import { useState } from "react";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import { useVaultWrite } from "@/lib/useVaultWrite";
import { explorerTx } from "@/lib/chain";
import { DEFAULT_BENEFICIARY } from "@/lib/constants";

const DEADLINE_PRESETS = [
  { label: "2 min (demo)", secs: 120 },
  { label: "1 hour", secs: 3600 },
  { label: "1 day", secs: 86400 },
  { label: "1 week", secs: 604800 },
];

export function CreateForm({ onCreated }: { onCreated: () => void }) {
  const { address, isConnected } = useAccount();
  const write = useVaultWrite(onCreated);

  const [description, setDescription] = useState("");
  const [preset, setPreset] = useState(DEADLINE_PRESETS[0].secs);
  const [stake, setStake] = useState("0.1");
  const [witness, setWitness] = useState("");
  const [beneficiary, setBeneficiary] = useState<string>(DEFAULT_BENEFICIARY);

  const witnessOk = isAddress(witness);
  const witnessIsSelf = witnessOk && address && witness.toLowerCase() === address.toLowerCase();
  const beneficiaryOk = isAddress(beneficiary);
  const stakeOk = Number(stake) > 0;
  const canSubmit =
    isConnected && description.trim().length > 0 && witnessOk && !witnessIsSelf && beneficiaryOk && stakeOk;

  const busy = write.isPending || write.isConfirming;

  async function submit() {
    if (!canSubmit) return;
    const deadlineSec = BigInt(Math.floor(Date.now() / 1000) + preset);
    await write.create({
      description: description.trim(),
      deadlineSec,
      witness: witness as `0x${string}`,
      beneficiary: beneficiary as `0x${string}`,
      stakeMon: stake,
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-6">
      <div>
        <h2 className="text-lg font-semibold text-text">Put money behind your word</h2>
        <p className="text-sm text-muted">
          Escrow MON behind a deadline. Ship in time and your witness refunds you. Miss it and anyone
          can send your stake to the beneficiary.
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-widest text-faint">The promise</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ship Privara milestone 2 to production"
          rows={2}
          className="resize-none rounded-md border border-line bg-bg px-3 py-2 text-sm text-text outline-none focus:border-live/50"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-widest text-faint">Deadline</span>
          <div className="flex flex-wrap gap-1.5">
            {DEADLINE_PRESETS.map((p) => (
              <button
                key={p.secs}
                onClick={() => setPreset(p.secs)}
                className={`tnum rounded-md border px-2.5 py-1.5 text-xs transition ${
                  preset === p.secs
                    ? "border-live/50 bg-live/10 text-live"
                    : "border-line text-muted hover:text-text"
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
            onChange={(e) => setStake(e.target.value)}
            inputMode="decimal"
            className="tnum rounded-md border border-line bg-bg px-3 py-2 text-sm text-text outline-none focus:border-live/50"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-widest text-faint">Witness address</span>
        <input
          value={witness}
          onChange={(e) => setWitness(e.target.value)}
          placeholder="0x… (someone other than you)"
          className="tnum rounded-md border border-line bg-bg px-3 py-2 text-sm text-text outline-none focus:border-live/50"
        />
        {witness && !witnessOk && <span className="text-xs text-gone">Not a valid address.</span>}
        {witnessIsSelf && (
          <span className="text-xs text-gone">Witness can&apos;t be you — that defeats the point.</span>
        )}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-widest text-faint">
          Beneficiary if you miss it
        </span>
        <input
          value={beneficiary}
          onChange={(e) => setBeneficiary(e.target.value)}
          className="tnum rounded-md border border-line bg-bg px-3 py-2 text-sm text-text outline-none focus:border-live/50"
        />
        <span className="text-xs text-faint">Defaults to a public-goods address. Make forfeiting hurt.</span>
      </label>

      <button
        onClick={submit}
        disabled={!canSubmit || busy}
        className="rounded-md border border-live/50 bg-live/15 px-4 py-2.5 text-sm font-semibold text-live transition hover:bg-live/25 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {!isConnected
          ? "Connect wallet to commit"
          : busy
            ? "Confirming on-chain…"
            : `Stake ${stakeOk ? stake : "…"} MON & commit`}
      </button>

      {write.error && <p className="text-xs text-gone">{write.error}</p>}
      {write.hash && (
        <a
          href={explorerTx(write.hash)}
          target="_blank"
          rel="noreferrer"
          className="tnum text-xs text-live underline decoration-dotted underline-offset-2"
        >
          {write.isConfirming ? "tx pending — view on explorer ↗" : "committed — view on explorer ↗"}
        </a>
      )}
    </div>
  );
}
