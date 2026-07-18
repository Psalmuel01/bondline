"use client";

import { useEffect, useRef, useState } from "react";
import { parseEther } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { FACTORY_ADDRESS, VAULT_ADDRESS, factoryAbi, vaultAbi } from "./contracts";

/// Wraps every Bondline write with pending/confirming/tx-hash state so the UI
/// can show each step happening on-chain (no fake optimistic updates). One hook
/// instance per action surface; pass a callback to refresh reads on confirm.
export function useBondlineWrite(onConfirmed?: () => void) {
  const { writeContractAsync, isPending } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | undefined>();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });

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

  async function run(
    fn: () => Promise<`0x${string}`>,
  ): Promise<`0x${string}` | undefined> {
    setError(undefined);
    try {
      const h = await fn();
      setHash(h);
      return h;
    } catch (e) {
      setError(friendly(e));
    }
  }

  const createPod = (name: string, members: `0x${string}`[], bps: number) =>
    run(() =>
      writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: "createPod",
        args: [name, members, bps],
      }),
    );

  const createCommitment = (
    pod: `0x${string}`,
    description: string,
    deadlineSec: bigint,
    stakeMon: string,
  ) =>
    run(() =>
      writeContractAsync({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "createCommitment",
        args: [pod, description, deadlineSec],
        value: parseEther(stakeMon),
      }),
    );

  const declareComplete = (
    id: bigint,
    evidenceHash: `0x${string}`,
    evidenceUri: string,
  ) =>
    run(() =>
      writeContractAsync({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "declareComplete",
        args: [id, evidenceHash, evidenceUri],
      }),
    );

  const castVote = (id: bigint, approve: boolean) =>
    run(() =>
      writeContractAsync({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "castVote",
        args: [id, approve],
      }),
    );

  const resolveExpired = (id: bigint) =>
    run(() =>
      writeContractAsync({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "resolveExpired",
        args: [id],
      }),
    );

  const forfeitMissed = (id: bigint) =>
    run(() =>
      writeContractAsync({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "forfeitMissed",
        args: [id],
      }),
    );

  const proposeWithdrawal = (
    pod: `0x${string}`,
    to: `0x${string}`,
    amountMon: string,
    memo: string,
  ) =>
    run(() =>
      writeContractAsync({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "proposeWithdrawal",
        args: [pod, to, parseEther(amountMon), memo],
      }),
    );

  const approveWithdrawal = (proposalId: bigint) =>
    run(() =>
      writeContractAsync({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: "approveWithdrawal",
        args: [proposalId],
      }),
    );

  return {
    createPod,
    createCommitment,
    declareComplete,
    castVote,
    resolveExpired,
    forfeitMissed,
    proposeWithdrawal,
    approveWithdrawal,
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
  const m = msg.match(
    /(StakeRequired|StakeTooLarge|DeadlineInPast|UnknownPod|NotPodMember|NotCreator|NotActive|DeadlinePassed|NotPending|CreatorCannotVote|AlreadyVoted|VoteClosed|VoteStillOpen|TransferFailed|InsufficientPodBalance|AlreadyExecuted|AlreadyApproved|PodTooSmall|ZeroMember|DuplicateMember|ThresholdOutOfRange|NoSuch\w+)/,
  );
  if (m) return m[1].replace(/([A-Z])/g, " $1").trim();
  return msg.split("\n")[0].slice(0, 140);
}
