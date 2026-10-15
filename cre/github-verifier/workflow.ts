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
  type HTTPPayload,
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
  hexToBytes,
  padHex,
  type Address,
} from "viem";
import {
  parseGithubSpec,
  countCommits,
} from "../../web/scripts/verification.mjs";
import { parseExternalSpec, verificationWindow, requiredProgress } from "../../web/scripts/verifier-adapters.mjs";

const address = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .refine((v) => v !== zeroAddress);
export const configSchema = z.object({
  schedule: z.string().min(1),
  coreAddress: address,
  receiverAddress: address,
  commitmentIds: z.array(z.string().regex(/^\d+$/)).max(5),
  authorizedKeys: z.array(address).max(5).optional(),
  productReports: z.boolean().optional(),
  observeOnly: z.boolean().optional(),
  transactionHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional(),
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
  const hashes = new Set<string>();
  // Bounded pagination: stop once the target is met, never mistake a truncated
  // response for final evidence of failure.
  for (let page = 1; page <= 10; page++) {
    const url = `https://api.github.com/repos/${spec.repo}/commits?author=${encodeURIComponent(spec.author)}&since=${encodeURIComponent(new Date(start * 1000).toISOString())}&until=${encodeURIComponent(new Date(until * 1000).toISOString())}&per_page=30&page=${page}`;
    const response = new cre.capabilities.HTTPClient().sendRequest(runtime, {
      url, method: "GET", headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    }).result();
    if (response.statusCode !== 200) throw new Error(`GitHub unavailable (${response.statusCode}); no report created.`);
    const data = JSON.parse(new TextDecoder().decode(response.body));
    for (const hash of countCommits(data, spec, start, until)) hashes.add(hash);
    if (hashes.size >= spec.commits || data.length < 30) return JSON.stringify([...hashes].sort().slice(0, spec.commits));
  }
  throw new Error("GitHub activity exceeds this verifier's supported pagination limit; no result authorized.");
}

export function fetchContractCallObservation(runtime: NodeRuntime<Config>, contract: string, creator: string, hash: string, start: number, deadline: number, observedAt: number): string {
  const rpc = (method: string, params: unknown[]) => {
    const response = new cre.capabilities.HTTPClient().sendRequest(runtime, {url: "https://testnet-rpc.monad.xyz", method: "POST", headers: {"Content-Type": "application/json"},body: new TextEncoder().encode(JSON.stringify({jsonrpc:"2.0",id:1,method,params}))}).result();
    if (response.statusCode !== 200) throw new Error("Onchain evidence source unavailable.");
    const data = JSON.parse(new TextDecoder().decode(response.body));
    if (data.error) throw new Error("Onchain evidence source returned an error.");
    return data.result;
  };
  if (rpc("eth_chainId",[]) !== "0x279f") throw new Error("Wrong evidence chain.");
  const receipt = rpc("eth_getTransactionReceipt",[hash]);
  if (!receipt || receipt.status !== "0x1" || receipt.from?.toLowerCase() !== creator.toLowerCase() || receipt.to?.toLowerCase() !== contract.toLowerCase()) return "[]";
  const finalized = rpc("eth_getBlockByNumber",["finalized",false]);
  const block = rpc("eth_getBlockByHash",[receipt.blockHash,false]);
  if (!block || !finalized || BigInt(block.number) > BigInt(finalized.number)) return "[]";
  const time = Number(BigInt(block.timestamp));
  if (time < start || time >= deadline || time > observedAt) return "[]";
  if (rpc("eth_getCode",[contract,block.number]) === "0x") return "[]";
  return JSON.stringify([hash.toLowerCase()]);
}

export function evaluateCommitments(runtime: Runtime<Config>, requestedIds?: string[]): string {
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
  for (const rawId of [...new Set(requestedIds ?? config.commitmentIds)]) {
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
    const spec = parseExternalSpec(raw);
    const window = verificationWindow(spec, Number(verification[4]), Number(bond[3]));
    const expired = observedAt >= Number(bond[3]);
    let hashes: string[] = [];
    const required = requiredProgress(spec);
    if (!expired) {
      if (spec.type === "github") {
        const observation = runtime.runInNodeMode(fetchGithubObservation, consensusIdenticalAggregation<string>())(raw, window.start, window.deadline, observedAt).result();
        hashes = JSON.parse(observation);
      } else {
        if (config.transactionHash) {
          const observation = runtime.runInNodeMode(fetchContractCallObservation, consensusIdenticalAggregation<string>())(spec.contract, bond[0], config.transactionHash, window.start, window.deadline, observedAt).result();
          hashes = JSON.parse(observation);
        }

      }
      if (hashes.length < required) {
        runtime.log(`Commitment ${id}: ${hashes.length}/${required} qualifying activity; waiting.`);
        if (!config.productReports && !config.observeOnly) continue;
      }
    }
    const evidenceHash = keccak256(
      toBytes(
        JSON.stringify({
          domain: "bondline.cre.verification.v1",
          chainId: 10143,
          verifierType: spec.type,
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
    const outcome = expired ? 2 : hashes.length >= required ? 1 : 0;
    const observation = {version: 1, chainId: 10143, core: config.coreAddress.toLowerCase(), verifier: config.receiverAddress.toLowerCase(), commitmentId: rawId, verifierType: spec.type, conditionHash: verification[3], evidenceHash, current: hashes.length, required, checkedAt: observedAt, blockNumber: protoBigIntToBigint(header.blockNumber!).toString(), blockHash: bytesToHex(header.hash), outcome};
    if (config.observeOnly) {
      runtime.log(`BONDLINE_RESULT ${JSON.stringify(observation)}`);
      continue;
    }
    const payload = config.productReports ? encodeAbiParameters(
      parseAbiParameters("uint256,uint8,bytes32,bytes32,uint256,uint256,uint64"),
      [id, outcome, verification[3], evidenceHash, BigInt(hashes.length), BigInt(required), BigInt(observedAt)],
    ) : encodeAbiParameters(parseAbiParameters("uint256,bool,bytes32,bytes32"), [id, !expired, verification[3], evidenceHash]);
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
export function onCron(runtime: Runtime<Config>): string { return evaluateCommitments(runtime); }
export function onHttp(runtime: Runtime<Config>, payload: HTTPPayload): string {
  if (!runtime.config.productReports || (runtime.config.authorizedKeys?.length ?? 0) === 0) throw new Error("Product execution is disabled.");
  const input = z.object({commitmentId: z.string().regex(/^(0|[1-9][0-9]{0,77})$/)}).strict().parse(JSON.parse(new TextDecoder().decode(payload.input)));
  // Only the ID is accepted. Creator, rule, verifier, deadline and condition
  // hash are always retrieved from finalized contract storage.
  return evaluateCommitments(runtime, [input.commitmentId]);
}
export function initWorkflow(config: Config) {
  const cron = cre.handler(new cre.capabilities.CronCapability().trigger({schedule: config.schedule}), onCron);
  if (!config.authorizedKeys?.length) return [cron];
  const http = cre.handler(new cre.capabilities.HTTPCapability().trigger({authorizedKeys: config.authorizedKeys.map(publicKey => ({type: "KEY_TYPE_ECDSA_EVM" as const, publicKey}))}), onHttp);
  return [cron, http];
}
