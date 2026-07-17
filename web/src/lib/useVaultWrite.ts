"use client";

import { useEffect, useRef, useState } from "react";
import { parseEther } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { VAULT_ADDRESS, vaultAbi } from "./contract";

/// Wraps a single vault write with pending/confirming/tx-hash state so the UI
/// can show every step happening on-chain (no fake optimistic updates).
export function useVaultWrite(onConfirmed?: () => void) {
  const { writeContractAsync, isPending } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | undefined>();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });

  // fire the refresh callback exactly once per confirmed tx
  const firedFor = useRef<`0x${string}` | undefined>(undefined);
  useEffect(() => {
    if (isSuccess && hash && firedFor.current !== hash) {
      firedFor.current = hash;
      onConfirmed?.();
    }
  }, [isSuccess, hash, onConfirmed]);

  const reset = () => {
    setHash(undefined);
    setError(undefined);
  };

  async function create(args: {
    description: string;
    deadlineSec: bigint;
    witness: `0x${string}`;
    beneficiary: `0x${string}`;
    stakeMon: string;
  }) {
    setError(undefined);
    try {
      const h = await writeContractAsync({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "createCommitment",
        args: [args.description, args.deadlineSec, args.witness, args.beneficiary],
        value: parseEther(args.stakeMon),
      });
      setHash(h);
      return h;
    } catch (e) {
      setError(friendly(e));
    }
  }

  async function markComplete(id: bigint) {
    setError(undefined);
    try {
      const h = await writeContractAsync({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "markComplete",
        args: [id],
      });
      setHash(h);
      return h;
    } catch (e) {
      setError(friendly(e));
    }
  }

  async function claimForfeit(id: bigint) {
    setError(undefined);
    try {
      const h = await writeContractAsync({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "claimForfeit",
        args: [id],
      });
      setHash(h);
      return h;
    } catch (e) {
      setError(friendly(e));
    }
  }

  return {
    create,
    markComplete,
    claimForfeit,
    hash,
    error,
    isPending,
    isConfirming,
    isSuccess,
    reset,
  };
}

function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/user rejected|denied/i.test(msg)) return "Transaction rejected.";
  // surface custom error names if present
  const m = msg.match(/(StakeRequired|DeadlineInPast|WitnessRequired|BeneficiaryRequired|WitnessCannotBeCreator|NotWitness|NotActive|DeadlinePassed|DeadlineNotReached|TransferFailed|NoSuchCommitment)/);
  if (m) return m[1].replace(/([A-Z])/g, " $1").trim();
  return msg.split("\n")[0].slice(0, 140);
}
