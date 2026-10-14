import { expect } from "bun:test";
import {
  test,
  newTestRuntime,
  EvmMock,
  HttpActionsMock,
  addContractMock,
  REPORT_METADATA_HEADER_LENGTH,
} from "@chainlink/cre-sdk/test";
import { cre } from "@chainlink/cre-sdk";
import {
  decodeAbiParameters,
  parseAbiParameters,
  bytesToHex,
  keccak256,
  toBytes,
} from "viem";
import { onCron, coreAbi, configSchema, type Config } from "./workflow";
const config: Config = {
  schedule: "0 */1 * * * *",
  coreAddress: "0x1111111111111111111111111111111111111111",
  receiverAddress: "0x2222222222222222222222222222222222222222",
  commitmentIds: ["7"],
  reportGasLimit: "220000",
};
const raw = JSON.stringify({
  type: "github",
  repo: "owner/repo",
  author: "owner",
  commits: 1,
});
function fixture(
  options: {
    observedAt?: number;
    commits?: number;
    githubStatus?: number;
    status?: number;
    verifier?: string;
    badHash?: boolean;
    reverted?: boolean;
  } = {},
) {
  const evm = EvmMock.testInstance(
    cre.capabilities.EVMClient.SUPPORTED_CHAIN_SELECTORS["monad-testnet"],
  );
  evm.headerByNumber = () => ({
    header: {
      timestamp: String(options.observedAt ?? 1500),
      blockNumber: { absVal: "AQ==", sign: "1" },
      hash: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      parentHash: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    },
  });
  const contract = addContractMock(evm, {
    address: config.coreAddress as `0x${string}`,
    abi: coreAbi,
  });
  contract.protocolVersion = () => 2n;
  contract.bonds = () => [
    config.coreAddress,
    config.coreAddress,
    1000n,
    2000n,
    0n,
    options.status ?? 0,
    0,
    0,
    "Public repository activity",
    keccak256(toBytes("unused")),
    "",
  ];
  contract.verification = () => [
    2,
    options.verifier ?? config.receiverAddress,
    0n,
    keccak256(toBytes(options.badHash ? "changed" : raw)),
    100n,
  ];
  contract.verificationSpec = () => raw;
  let requests = 0;
  let writes = 0;
  let outcome: readonly unknown[] = [];
  const http = HttpActionsMock.testInstance();
  http.sendRequest = (request) => {
    requests++;
    expect(
      request.url.startsWith(
        "https://api.github.com/repos/owner/repo/commits?",
      ),
    ).toBe(true);
    return {
      statusCode: options.githubStatus ?? 200,
      body: Buffer.from(
        JSON.stringify(
          Array.from({ length: options.commits ?? 1 }, (_, i) => ({
            sha: i.toString(16).padStart(40, "a"),
            author: { login: "owner" },
            commit: { author: { date: new Date(1200 * 1000).toISOString() } },
          })),
        ),
      ).toString("base64"),
    };
  };
  evm.writeReport = (input) => {
    writes++;
    expect(bytesToHex(input.receiver).toLowerCase()).toBe(
      config.receiverAddress,
    );
    expect(input.gasConfig?.gasLimit).toBe(220000n);
    outcome = decodeAbiParameters(
      parseAbiParameters("uint256,bool,bytes32,bytes32"),
      bytesToHex(input.report!.rawReport.slice(REPORT_METADATA_HEADER_LENGTH)),
    );
    return {
      txStatus: "TX_STATUS_SUCCESS",
      receiverContractExecutionStatus: options.reverted
        ? "RECEIVER_CONTRACT_EXECUTION_STATUS_REVERTED"
        : "RECEIVER_CONTRACT_EXECUTION_STATUS_SUCCESS",
      txHash: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    };
  };
  const runtime = newTestRuntime<Config>(null, {}, config);
  return { runtime, stats: () => ({ requests, writes, outcome }) };
}
test("CRE capabilities read immutable rules, reach consensus on GitHub, and produce the bound report", () => {
  const f = fixture();
  expect(onCron(f.runtime)).toContain("1 settlement");
  const s = f.stats();
  expect(s.requests).toBe(1);
  expect(s.writes).toBe(1);
  expect(s.outcome[0]).toBe(7n);
  expect(s.outcome[1]).toBe(true);
  expect(s.outcome[2]).toBe(keccak256(toBytes(raw)));
  expect(s.outcome[3]).not.toBe("0x" + "0".repeat(64));
});
test("unfinished GitHub conditions wait without signing or writing", () => {
  const f = fixture({ commits: 0 });
  expect(onCron(f.runtime)).toContain("0 settlement");
  expect(f.stats().writes).toBe(0);
});
test("GitHub outages fail closed without a report", () => {
  const f = fixture({ githubStatus: 429 });
  expect(() => onCron(f.runtime)).toThrow("GitHub unavailable");
  expect(f.stats().writes).toBe(0);
});
test("settled commitments and commitments assigned to another verifier are skipped", () => {
  for (const options of [{ status: 2 }, { verifier: config.coreAddress }]) {
    const f = fixture(options);
    expect(onCron(f.runtime)).toContain("0 settlement");
    expect(f.stats().requests).toBe(0);
    expect(f.stats().writes).toBe(0);
  }
});
test("deadline expiry follows contract policy and produces failure rather than accepting late success", () => {
  const f = fixture({ observedAt: 2000 });
  onCron(f.runtime);
  expect(f.stats().requests).toBe(0);
  expect(f.stats().outcome[1]).toBe(false);
});
test("condition tampering is rejected before calling GitHub or producing a report", () => {
  const f = fixture({ badHash: true });
  expect(() => onCron(f.runtime)).toThrow("immutable condition hash");
  expect(f.stats().requests).toBe(0);
  expect(f.stats().writes).toBe(0);
});
test("a reverted receiver is never counted as a successful report", () => {
  const f = fixture({ reverted: true });
  expect(() => onCron(f.runtime)).toThrow("did not execute");
});
test("placeholder recipients and unbounded workload are rejected", () => {
  expect(() =>
    configSchema.parse({ ...config, receiverAddress: "0x" + "0".repeat(40) }),
  ).toThrow();
  expect(() =>
    configSchema.parse({ ...config, commitmentIds: Array(6).fill("7") }),
  ).toThrow();
});
