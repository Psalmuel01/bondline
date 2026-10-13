"use client";

import { useEffect, useRef, useState } from "react";
import { parseEther, type Abi, type Address } from "viem";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, usePublicClient, useSwitchChain } from "wagmi";
import {
  CIRCLE_FACTORY_ADDRESS,
  CORE_ADDRESS,
  circleFactoryAbi,
  coreAbi,
  circleAbi,
} from "./contracts";
import { monadMainnet } from "./chain";

/// Wraps every Bondline write with pending/confirming/tx-hash state so the UI
/// can show each step happening on-chain (no fake optimistic updates). One hook
/// instance per action surface; pass a callback to refresh reads on confirm.
export function useBondlineWrite(onConfirmed?: () => void) {
  const { chainId, address: account } = useAccount();
  const client = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending } = useWriteContract();
  const [isPreparing, setIsPreparing] = useState(false);
  async function writeEstimated(parameters: { address: Address; abi: Abi; functionName: string; args?: readonly unknown[]; value?: bigint }) {
    if (!client || !account) throw new Error("Sign in to confirm this action.");
    const gas = await client.estimateContractGas({ ...parameters, account } as Parameters<typeof client.estimateContractGas>[0]);
    return writeContractAsync({ ...parameters, gas: gas + gas / 20n, chainId: monadMainnet.id } as Parameters<typeof writeContractAsync>[0]);
  }
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | undefined>();

  const { data: receipt, isLoading: isConfirming, isSuccess: receiptLoaded } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });

  const isSuccess = receiptLoaded && receipt?.status === "success";
  useEffect(() => { if (receipt?.status === "reverted") setError("This action did not complete. Your funds were not committed; refresh and retry."); }, [receipt]);

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
    setIsPreparing(true);
    try {
      // Make sure the wallet is on Monad before firing. Otherwise the tx goes
      // to whatever chain the wallet is on and fails with a cryptic error the
      // user can't connect to "wrong network".
      if (chainId !== monadMainnet.id) {
        await switchChainAsync({ chainId: monadMainnet.id });
      }
      const h = await fn();
      setHash(h);
      return h;
    } catch (e) {
      setError(friendly(e));
    } finally { setIsPreparing(false); }
  }

  const createCircle = (name: string, members: `0x${string}`[], bps: number) =>
    run(() =>
      writeEstimated({
        address: CIRCLE_FACTORY_ADDRESS,
        abi: circleFactoryAbi,
        functionName: "createCircle",
        args: [name, members, bps],
      }),
    );

  const openBond = (
    circle: `0x${string}`,
    description: string,
    deadlineSec: bigint,
    stakeMon: string,
  ) =>
    run(() =>
      writeEstimated({
        address: CORE_ADDRESS,
        abi: coreAbi,
        functionName: "openBond",
        args: [circle, description, deadlineSec],
        value: parseEther(stakeMon),
      }),
    );

  const declareDone = (
    id: bigint,
    receiptsHash: `0x${string}`,
    receiptsUri: string,
  ) =>
    run(() =>
      writeEstimated({
        address: CORE_ADDRESS,
        abi: coreAbi,
        functionName: "declareDone",
        args: [id, receiptsHash, receiptsUri],
      }),
    );

  const cosign = (id: bigint) =>
    run(() =>
      writeEstimated({
        address: CORE_ADDRESS,
        abi: coreAbi,
        functionName: "cosign",
        args: [id],
      }),
    );

  const object = (id: bigint) =>
    run(() =>
      writeEstimated({
        address: CORE_ADDRESS,
        abi: coreAbi,
        functionName: "object",
        args: [id],
      }),
    );

  const resolveExpired = (id: bigint) =>
    run(() =>
      writeEstimated({
        address: CORE_ADDRESS,
        abi: coreAbi,
        functionName: "resolveExpired",
        args: [id],
      }),
    );

  const crossMissed = (id: bigint) =>
    run(() =>
      writeEstimated({
        address: CORE_ADDRESS,
        abi: coreAbi,
        functionName: "crossMissed",
        args: [id],
      }),
    );

  const proposePayout = (
    circle: `0x${string}`,
    to: `0x${string}`,
    amountMon: string,
    memo: string,
  ) =>
    run(() =>
      writeEstimated({
        address: CORE_ADDRESS,
        abi: coreAbi,
        functionName: "proposePayout",
        args: [circle, to, parseEther(amountMon), memo],
      }),
    );

  const cosignPayout = (payoutId: bigint) =>
    run(() =>
      writeEstimated({
        address: CORE_ADDRESS,
        abi: coreAbi,
        functionName: "cosignPayout",
        args: [payoutId],
      }),
    );

  const openVerifiedBond = (circle: `0x${string}`, description: string, deadline: bigint, stake: string, kind: number, verifier: `0x${string}`, target: bigint, spec: string) => run(() => writeEstimated({ address: CORE_ADDRESS, abi: coreAbi, functionName: "openVerifiedBond", args: [circle, description, deadline, kind, verifier, target, spec], value: parseEther(stake) }));
  const backCommitment = (id: bigint) => run(() => writeEstimated({ address: CORE_ADDRESS, abi: coreAbi, functionName: "backCommitment", args: [id] }));
  const verifyBalance = (id: bigint) => run(() => writeEstimated({ address: CORE_ADDRESS, abi: coreAbi, functionName: "verifyBalance", args: [id] }));
  const joinTesterCohort = () => run(() => writeEstimated({ address: CORE_ADDRESS, abi: coreAbi, functionName: "joinTesterCohort" }));
  const withdrawRefund = (to: Address) => run(() => writeEstimated({ address: CORE_ADDRESS, abi: coreAbi, functionName: "withdrawRefund", args: [to] }));
  const claimReward = (circle: `0x${string}`, epoch: bigint, to: `0x${string}`) => run(() => writeEstimated({ address: CORE_ADDRESS, abi: coreAbi, functionName: "claimReward", args: [circle, epoch, to] }));
  const invite = (circle: `0x${string}`, member: `0x${string}`) => run(() => writeEstimated({ address: circle, abi: circleAbi, functionName: "invite", args: [member] }));
  const join = (circle: `0x${string}`) => run(() => writeEstimated({ address: circle, abi: circleAbi, functionName: "join" }));
  return {
    openVerifiedBond, backCommitment, verifyBalance, claimReward, invite, join, withdrawRefund, joinTesterCohort,
    createCircle,
    openBond,
    declareDone,
    cosign,
    object,
    resolveExpired,
    crossMissed,
    proposePayout,
    cosignPayout,
    hash,
    error,
    isPending: isPending || isPreparing,
    isConfirming,
    isSuccess,
    reset,
  };
}

function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/needs more|wrong network|request is missing|destination is missing|same passkey/i.test(msg)) return msg.split("\n")[0];
  if (/insufficient funds|insufficient balance/i.test(msg)) return "Your account needs more MON to cover this action. Add funds and retry.";
  if (/user rejected|denied/i.test(msg)) return "Confirmation cancelled. Your commitment was not changed.";
  const m = msg.match(
    /(StakeRequired|StakeTooLarge|DeadlineInPast|UnknownCircle|NotCircleMember|NotCreator|NotActive|DeadlinePassed|NotPending|CreatorCannotCosign|AlreadyCosigned|CosignClosed|CosignStillOpen|TransferFailed|InsufficientPotBalance|AlreadyExecuted|CircleTooSmall|ZeroMember|DuplicateMember|ThresholdOutOfRange|NoSuch\w+)/,
  );
  if (m) return m[1].replace(/([A-Z])/g, " $1").trim();
  return msg.split("\n")[0].slice(0, 140);
}
