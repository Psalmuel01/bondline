// Reproducible integration check on a LOCAL Anvil fork of the deployed v2 code.
// Never uses a private key, never broadcasts to Monad, never claims human testers.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseEther,
  keccak256,
  toBytes,
  getAddress,
  toHex,
} from "viem";
const rpc = new URL(process.env.ANVIL_RPC_URL || "http://127.0.0.1:8547");
if (
  !["127.0.0.1", "localhost", "[::1]"].includes(rpc.hostname) ||
  rpc.protocol !== "http:"
)
  throw Error("Lifecycle check is restricted to a local Anvil RPC.");
const chain = defineChain({
  id: 31337,
  name: "Local Monad fork",
  nativeCurrency: { name: "Local test MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [rpc.href] } },
});
const client = createPublicClient({ chain, transport: http(rpc.href) });
if ((await client.getChainId()) !== 31337)
  throw Error(
    "Only Anvil chain ID 31337 is allowed. No public-chain writes were attempted.",
  );
const core = process.env.NEXT_PUBLIC_CORE_ADDRESS,
  factory = process.env.NEXT_PUBLIC_CIRCLE_FACTORY_ADDRESS;
if (!core || !factory)
  throw Error("Set the existing v2 Core and Factory addresses.");
const abi = (file) =>
  JSON.parse(
    readFileSync(
      new URL(
        "../../contracts/out/" + file + ".sol/" + file + ".json",
        import.meta.url,
      ),
    ),
  ).abi;
const coreAbi = abi("BondlineCore"),
  factoryAbi = abi("CircleFactory"),
  circleAbi = abi("Circle");
const read = (functionName, args = []) =>
  client.readContract({ address: core, abi: coreAbi, functionName, args });
assert.equal(await read("protocolVersion"), 2n);
const accounts = Array.from({ length: 5 }, (_, i) =>
  getAddress(
    "0x" +
      keccak256(toBytes(`bondline-local-integration-fixture-v1-${i}`)).slice(
        -40,
      ),
  ),
);
for (const account of accounts) {
  if (await client.getCode({ address: account }))
    throw Error("A fixture address unexpectedly has code on the fork.");
  await client.request({
    method: "anvil_setBalance",
    params: [account, toHex(parseEther("100"))],
  });
  await client.request({
    method: "anvil_impersonateAccount",
    params: [account],
  });
}
const [alice, bob, carol, dan, eve] = accounts;
const receipts = [];
async function send(
  account,
  address,
  abi,
  functionName,
  args = [],
  value = 0n,
) {
  const gas = await client.estimateContractGas({
    account,
    address,
    abi,
    functionName,
    args,
    value,
  });
  const wallet = createWalletClient({
    chain,
    account,
    transport: http(rpc.href),
  });
  const hash = await wallet.writeContract({
    address,
    abi,
    functionName,
    args,
    value,
    gas: gas + gas / 20n,
  });
  const receipt = await client.waitForTransactionReceipt({ hash });
  assert.equal(receipt.status, "success");
  receipts.push({
    functionName,
    hash,
    blockNumber: String(receipt.blockNumber),
  });
  return receipt;
}
const now = async () => Number((await client.getBlock()).timestamp);
const warp = async (time) => {
  await client.request({ method: "evm_setNextBlockTimestamp", params: [time] });
  await client.request({ method: "evm_mine", params: [] });
};
const period = 604800;
if (
  Math.floor((await now()) / period) !==
  Math.floor(((await now()) + 86400) / period)
)
  await warp((Math.floor((await now()) / period) + 1) * period + 10);
const initial = Number(await read("bondCount"));
const circles = [];
async function create(name, members) {
  await send(members[0], factory, factoryAbi, "createCircle", [
    name,
    members,
    5000,
  ]);
  const all = await client.readContract({
    address: factory,
    abi: factoryAbi,
    functionName: "allCircles",
  });
  const address = all.at(-1);
  circles.push({ name, address });
  return address;
}
const builders = await create("[Synthetic] Builders Circle", [alice, bob]);
const fitness = await create("[Synthetic] Fitness Circle", [bob, carol]);
const study = await create("[Synthetic] Study Circle", [alice, dan]);
async function open(account, circle, goal, stake = "0.01", kind = 0, duration = 120) {
  const id = await read("bondCount");
  const deadline = BigInt((await now()) + duration);
  if (kind === 0)
    await send(
      account,
      core,
      coreAbi,
      "openBond",
      [circle, goal, deadline],
      parseEther(stake),
    );
  else
    await send(
      account,
      core,
      coreAbi,
      "openVerifiedBond",
      [
        circle,
        goal,
        deadline,
        kind,
        "0x0000000000000000000000000000000000000000",
        1n,
        "",
      ],
      parseEther(stake),
    );
  return { id, deadline };
}
const success = await open(alice, builders, "Ship the README update");
await send(bob, core, coreAbi, "backCommitment", [success.id]);
await send(alice, builders, circleAbi, "invite", [eve]);
await send(eve, builders, circleAbi, "join", []);
const uri = "https://example.com/local-layout-fixture-proof";
await send(alice, core, coreAbi, "declareDone", [
  success.id,
  keccak256(toBytes(uri)),
  uri,
]);
await assert.rejects(() =>
  client.simulateContract({
    account: eve,
    address: core,
    abi: coreAbi,
    functionName: "cosign",
    args: [success.id],
  }),
);
await send(bob, core, coreAbi, "cosign", [success.id]);
assert.equal((await read("bonds", [success.id]))[5], 2);
const balance = await open(
  bob,
  fitness,
  "Reach the configured account balance",
  "0.01",
  1,
);
await send(carol, core, coreAbi, "backCommitment", [balance.id]);
await send(carol, core, coreAbi, "verifyBalance", [balance.id]);
assert.equal((await read("bonds", [balance.id]))[5], 2);
const failed = await open(dan, study, "Finish the study session", "0.02");
const winner = await open(alice, study, "Publish study notes");
await send(dan, core, coreAbi, "backCommitment", [winner.id]);
await send(alice, core, coreAbi, "declareDone", [
  winner.id,
  keccak256(toBytes(uri)),
  uri,
]);
await send(dan, core, coreAbi, "cosign", [winner.id]);
const active = await open(eve, builders, "Ship the next milestone", "0.01", 0, 14 * 86400);
await send(alice, core, coreAbi, "backCommitment", [active.id]);
await warp(Number(failed.deadline) + 1);
await send(alice, core, coreAbi, "crossMissed", [failed.id]);
assert.equal((await read("bonds", [failed.id]))[5], 3);
assert.equal(await client.getBalance({ address: study }), parseEther("0.02"));
assert.equal(await read("reservedPot", [study]), parseEther("0.02"));
const epoch = failed.deadline / BigInt(period);
await warp(Number(epoch + 1n) * period + 1);
await send(alice, core, coreAbi, "closePeriod", [study, epoch]);
await send(alice, core, coreAbi, "claimReward", [study, epoch, alice]);
assert.equal(await client.getBalance({ address: study }), 0n);
assert.equal(await read("reservedPot", [study]), 0n);
await assert.rejects(() =>
  client.simulateContract({
    account: alice,
    address: core,
    abi: coreAbi,
    functionName: "claimReward",
    args: [study, epoch, alice],
  }),
);
const state = [];
for (let id = BigInt(initial); id < (await read("bondCount")); id++) {
  const b = await read("bonds", [id]);
  state.push({
    id: String(id),
    goal: b[8],
    status: b[5],
    stake: String(b[2]),
    circle: b[1],
  });
}
const result = {
  scope: "LOCAL ANVIL FORK ONLY; not live Monad transactions or human traction",
  chainId: 31337,
  core,
  factory,
  fixtureAccounts: accounts.slice(0, 5),
  circles,
  state,
  verified: [
    "Circle creation",
    "Invitation and joining",
    "Frozen reviewer eligibility",
    "Native escrow",
    "Social backing",
    "Evidence success settlement",
    "Automatic balance settlement",
    "Missed deadline -> reserved Pot",
    "Weekly close and reward claim",
    "Replay claim rejection",
  ],
  receipts,
};
if (process.env.BONDLINE_LOCAL_CHECK_OUTPUT)
  writeFileSync(
    process.env.BONDLINE_LOCAL_CHECK_OUTPUT,
    JSON.stringify(result, null, 2),
  );
console.log(
  JSON.stringify(
    {
      scope: result.scope,
      circles: circles.length,
      fixtureAccounts: 5,
      commitments: state.length,
      successful: state.filter((x) => x.status === 2).length,
      failed: state.filter((x) => x.status === 3).length,
      localTransactions: receipts.length,
      verified: result.verified,
    },
    null,
    2,
  ),
);
