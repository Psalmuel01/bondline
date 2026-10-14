import {
  cre,
  Runner,
  encodeCallMsg,
  LAST_FINALIZED_BLOCK_NUMBER,
  consensusIdenticalAggregation,
  prepareReportRequest,
  blockNumber,
  protoBigIntToBigint,
  type Runtime,
  type NodeRuntime,
} from "@chainlink/cre-sdk";
import { z } from "zod";
import {
  parseAbi,
  encodeFunctionData,
  decodeFunctionResult,
  encodeAbiParameters,
  parseAbiParameters,
  bytesToHex,
  keccak256,
  toBytes,
  zeroAddress,
  type Address,
} from "viem";
import {
  parseGithubSpec,
  countCommits,
} from "../../web/scripts/verification.mjs";

const address = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .refine((v) => v !== zeroAddress);
export const configSchema = z.object({
  schedule: z.string().min(1),
  coreAddress: address,
  receiverAddress: address,
  commitmentIds: z.array(z.string().regex(/^\d+$/)).min(1).max(5),
  // Calibrate against the actual Monad forwarder/receiver before enabling writes.
  reportGasLimit: z
    .string()
    .regex(/^\d+$/)
    .refine((v) => BigInt(v) >= 100000n && BigInt(v) <= 1000000n),
});
export type Config = z.infer<typeof configSchema>;
export const coreAbi = parseAbi([
  "function protocolVersion() view returns (uint256)",
  "function bonds(uint256) view returns (address creator,address circle,uint96 stake,uint64 deadline,uint64 cosignClosesAt,uint8 status,uint32 cosigns,uint32 objections,string description,bytes32 receiptsHash,string receiptsUri)",
  "function verification(uint256) view returns (uint8 kind,address verifier,uint96 targetBalance,bytes32 conditionHash,uint64 createdAt)",
  "function verificationSpec(uint256) view returns (string)",
]);
const selector =
  cre.capabilities.EVMClient.SUPPORTED_CHAIN_SELECTORS["monad-testnet"];
if (!selector) throw new Error("This CRE SDK does not support Monad testnet.");

export function fetchGithubObservation(
  runtime: NodeRuntime<Config>,
  raw: string,
  start: number,
  deadline: number,
  observedAt: number,
): string {
  const spec = parseGithubSpec(raw);
  const until = Math.min(deadline, observedAt);
  const url = `https://api.github.com/repos/${spec.repo}/commits?author=${encodeURIComponent(spec.author)}&since=${encodeURIComponent(new Date(start * 1000).toISOString())}&until=${encodeURIComponent(new Date(until * 1000).toISOString())}&per_page=100`;
  const response = new cre.capabilities.HTTPClient()
    .sendRequest(runtime, {
      url,
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
    .result();
  if (response.statusCode !== 200)
    throw new Error(
      `GitHub unavailable (${response.statusCode}); no report created.`,
    );
  const data = JSON.parse(new TextDecoder().decode(response.body));
  return JSON.stringify(countCommits(data, spec, start, deadline));
}

export function onCron(runtime: Runtime<Config>): string {
  const config = configSchema.parse(runtime.config);
  const evm = new cre.capabilities.EVMClient(selector);
  const header = evm
    .headerByNumber(runtime, { blockNumber: LAST_FINALIZED_BLOCK_NUMBER })
    .result().header;
  if (!header?.blockNumber)
    throw new Error("A finalized Monad block is required.");
  const observedAt = Number(header.timestamp);
  const call = (
    functionName:
      | "protocolVersion"
      | "bonds"
      | "verification"
      | "verificationSpec",
    args: readonly bigint[] = [],
  ): unknown => {
    const data = encodeFunctionData({
      abi: coreAbi,
      functionName,
      args: args as never,
    });
    const result = evm
      .callContract(runtime, {
        call: encodeCallMsg({
          from: zeroAddress,
          to: config.coreAddress as Address,
          data,
        }),
        blockNumber: blockNumber(protoBigIntToBigint(header.blockNumber!)),
      })
      .result();
    return decodeFunctionResult({
      abi: coreAbi,
      functionName,
      data: bytesToHex(result.data),
    });
  };
  if (call("protocolVersion") !== 2n)
    throw new Error("Expected Bondline protocol v2.");
  let settled = 0;
  for (const rawId of [...new Set(config.commitmentIds)]) {
    const id = BigInt(rawId);
    const bond = call("bonds", [id]) as readonly [
      Address,
      Address,
      bigint,
      bigint,
      bigint,
      number,
      number,
      number,
      string,
      `0x${string}`,
      string,
    ];
    if (bond[5] !== 0) continue;
    const verification = call("verification", [id]) as readonly [
      number,
      Address,
      bigint,
      `0x${string}`,
      bigint,
    ];
    if (
      verification[0] !== 2 ||
      verification[1].toLowerCase() !== config.receiverAddress.toLowerCase()
    )
      continue;
    const raw = call("verificationSpec", [id]) as string;
    if (keccak256(toBytes(raw)) !== verification[3])
      throw new Error("The immutable condition hash does not match.");
    const spec = parseGithubSpec(raw);
    const expired = observedAt >= Number(bond[3]);
    let hashes: string[] = [];
    if (!expired) {
      const observation = runtime
        .runInNodeMode(
          fetchGithubObservation,
          consensusIdenticalAggregation<string>(),
        )(raw, Number(verification[4]), Number(bond[3]), observedAt)
        .result();
      hashes = JSON.parse(observation);
      if (hashes.length < spec.commits) {
        runtime.log(
          `Commitment ${id}: ${hashes.length}/${spec.commits} qualifying public commits; waiting.`,
        );
        continue;
      }
    }
    const evidenceHash = keccak256(
      toBytes(
        JSON.stringify({
          domain: "bondline.cre.github.v1",
          core: config.coreAddress.toLowerCase(),
          id: rawId,
          conditionHash: verification[3],
          observedAt,
          block: bytesToHex(header.hash),
          outcome: expired
            ? "verification-deadline-expired"
            : "github-condition-met",
          hashes,
        }),
      ),
    );
    const payload = encodeAbiParameters(
      parseAbiParameters("uint256,bool,bytes32,bytes32"),
      [id, !expired, verification[3], evidenceHash],
    );
    const signedReport = runtime.report(prepareReportRequest(payload)).result();
    const result = evm
      .writeReport(runtime, {
        receiver: config.receiverAddress,
        report: signedReport,
        gasConfig: { gasLimit: config.reportGasLimit },
      })
      .result();
    if (
      result.errorMessage ||
      result.txStatus !== 2 ||
      result.receiverContractExecutionStatus === 1
    )
      throw new Error(
        result.errorMessage || "The report did not execute successfully.",
      );
    runtime.log(
      `Commitment ${id}: report status ${result.txStatus}; ${result.txHash ? bytesToHex(result.txHash) : "dry-run result, verify broadcast separately"}`,
    );
    settled++;
  }
  return `Prepared ${settled} settlement report(s).`;
}
export function initWorkflow(config: Config) {
  return [
    cre.handler(
      new cre.capabilities.CronCapability().trigger({
        schedule: config.schedule,
      }),
      onCron,
    ),
  ];
}
