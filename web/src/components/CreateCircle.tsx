"use client";

import { useMemo, useState } from "react";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import { useBondlineWrite } from "@/lib/useBondlineWrite";
import { bpsToPct, thresholdSentence } from "@/lib/threshold";
import { explorerTx } from "@/lib/chain";
import { shortAddr } from "@/lib/format";
import { Avatar } from "./Avatar";

export function CreateCircle({ onCreated }: { onCreated: () => void }) {
  const { address } = useAccount();
  const write = useBondlineWrite(onCreated);
  const [name, setName] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<`0x${string}`[]>([]);
  const [error, setError] = useState("");
  const [bps, setBps] = useState(5000);
  const allMembers = useMemo(
    () =>
      address
        ? [
            address,
            ...members.filter(
              (member) => member.toLowerCase() !== address.toLowerCase(),
            ),
          ]
        : members,
    [address, members],
  );
  const canSubmit = !!address && name.trim() && allMembers.length >= 2;
  const busy = write.isPending || write.isConfirming;
  function addMember() {
    const candidate = memberInput.trim();
    if (!isAddress(candidate)) {
      setError("Paste a full wallet address to add a member.");
      return;
    }
    if (
      allMembers.some(
        (member) => member.toLowerCase() === candidate.toLowerCase(),
      )
    ) {
      setError("That wallet is already in the Circle.");
      return;
    }
    setMembers((previous) => [...previous, candidate as `0x${string}`]);
    setMemberInput("");
    setError("");
  }
  async function submit() {
    if (canSubmit) await write.createCircle(name.trim(), allMembers, bps);
  }
  return (
    <div className=" p-6 sm:p-8">
      <div>
        <p className="tnum text-[10px] uppercase tracking-[0.18em] text-gold">
          New Circle
        </p>
        <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight text-bone">
          Bring your people together.
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
          Create a private conversation and a shared space for your goals. Add
          at least one friend to start.
        </p>
      </div>
      {!address && (
        <p className="mt-5 rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs text-gold">
          Connect your wallet first — you&apos;ll be the first member.
        </p>
      )}
      <div className="mt-7 grid gap-6 ">
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-widest text-faint">
              Circle name
            </span>
            <input
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Sunday runners · The shipping club"
              className="rounded-lg border border-line bg-bg px-3.5 py-3 text-sm text-bone outline-none focus:border-gold/50"
            />
          </label>
          <div>
            <span className="text-xs uppercase tracking-widest text-faint">
              Invite the crew
            </span>
            <p className="mt-1 text-xs text-muted">
              Ask for your friend’s Bondline account address. They can copy it
              from their account menu.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                aria-label="Friend’s account address"
                value={memberInput}
                onChange={(event) => setMemberInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addMember();
                  }
                }}
                placeholder="0x…"
                className="tnum min-w-0 flex-1 rounded-lg border border-line bg-bg px-3.5 py-3 text-sm text-bone outline-none focus:border-gold/50"
              />
              <button
                type="button"
                onClick={addMember}
                className="rounded-lg border border-gold/40 px-4 text-sm font-medium text-gold transition hover:bg-gold/10"
              >
                Add
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-forfeit">{error}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {allMembers.map((member) => (
                <div
                  key={member}
                  className="flex items-center gap-2 rounded-full border border-line bg-bg px-2 py-1"
                >
                  <Avatar
                    addr={member}
                    size={24}
                    you={member.toLowerCase() === address?.toLowerCase()}
                  />
                  <span className="tnum text-xs text-muted">
                    {shortAddr(member)}
                  </span>
                  {member.toLowerCase() !== address?.toLowerCase() && (
                    <button
                      type="button"
                      onClick={() =>
                        setMembers((previous) =>
                          previous.filter(
                            (value) =>
                              value.toLowerCase() !== member.toLowerCase(),
                          ),
                        )
                      }
                      aria-label={`Remove ${shortAddr(member)}`}
                      className="text-faint hover:text-forfeit"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-bg/45 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-faint">
              Evidence approvals
            </span>
            <span className="tnum text-lg font-semibold text-gold">
              {bpsToPct(bps)}%
            </span>
          </div>
          <input
            aria-label="Percentage of evidence reviewers required"
            type="range"
            min={1000}
            max={10000}
            step={500}
            value={bps}
            onChange={(event) => setBps(Number(event.target.value))}
            className="mt-5 w-full accent-gold"
          />
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {thresholdSentence(allMembers.length, bps)}
          </p>
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-xs text-faint">
              You can add a mission, Pot goal, and banner after creating your
              Circle.
            </p>
          </div>
        </div>
      </div>
      <button
        onClick={submit}
        disabled={!canSubmit || busy}
        className="mt-7 w-full rounded-lg bg-gold px-4 py-3 text-sm font-semibold text-ink transition hover:brightness-108 disabled:opacity-40"
      >
        {busy ? "Creating your Circle…" : "Create Circle"}
      </button>
      {write.error && (
        <p className="mt-3 text-xs text-forfeit">{write.error}</p>
      )}
      {write.hash && (
        <a
          href={explorerTx(write.hash)}
          target="_blank"
          rel="noreferrer"
          className="tnum mt-3 block text-xs text-gold underline decoration-dotted underline-offset-2"
        >
          {write.isConfirming ? "deployment pending ↗" : "Circle deployed ↗"}
        </a>
      )}
    </div>
  );
}
