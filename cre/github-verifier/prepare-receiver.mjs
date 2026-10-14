// Read-only deployment preparation. No signing key, wallet client or broadcast.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createPublicClient, http, isAddress, zeroAddress, encodeDeployData, encodeFunctionData, parseAbi, formatEther } from "viem";

const manifest = JSON.parse(readFileSync(new URL("../../docs/deployments/monad-testnet.json", import.meta.url)));
if (manifest.chainId !== 10143 || manifest.protocolVersion !== 2) throw Error("This preparation targets only the current v2 Monad testnet manifest.");
const core = manifest.contracts.core;
const owner = process.env.BONDLINE_CRE_WORKFLOW_OWNER;
const forwarder = process.env.BONDLINE_CRE_FORWARDER_ADDRESS;
const name = process.env.BONDLINE_CRE_WORKFLOW_NAME || "bondline-github";
const sender = process.env.BONDLINE_CRE_DEPLOYER_ADDRESS || owner;
const workflowName = "0x" + Buffer.from(createHash("sha256").update(name).digest("hex").slice(0, 10), "ascii").toString("hex");
const validAddress = (value) => isAddress(value || "") && value.toLowerCase() !== zeroAddress;
if (!validAddress(owner) || !validAddress(forwarder) || !validAddress(sender)) throw Error("Set BONDLINE_CRE_WORKFLOW_OWNER to the linked CRE owner, BONDLINE_CRE_FORWARDER_ADDRESS to your tenant's production forwarder, and optionally BONDLINE_CRE_DEPLOYER_ADDRESS. Public addresses only; no private keys needed.");
if (name !== "bondline-github") throw Error("Workflow name must match workflow.yaml: bondline-github.");
const client = createPublicClient({ transport: http(process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz") });
if (await client.getChainId() !== 10143) throw Error("Wrong RPC chain. No transaction was submitted.");
const coreAbi = parseAbi(["function protocolVersion() view returns (uint256)", "function deployer() view returns (address)", "function setTrustedVerifier(address verifier, bool trusted)", "function isTrustedVerifier(address verifier) view returns (bool)"]);
const [coreCode, forwarderCode, version, registryAuthority] = await Promise.all([
  client.getCode({ address: core }), client.getCode({ address: forwarder }),
  client.readContract({ address: core, abi: coreAbi, functionName: "protocolVersion" }),
  client.readContract({ address: core, abi: coreAbi, functionName: "deployer" }),
]);
if (!coreCode || !forwarderCode || version !== 2n) throw Error("Core version or forwarder code check failed.");
const artifact = JSON.parse(readFileSync(new URL("../../contracts/out/BondlineCREVerifier.sol/BondlineCREVerifier.json", import.meta.url)));
const deploymentData = encodeDeployData({ abi: artifact.abi, bytecode: artifact.bytecode.object, args: [core, forwarder, owner, workflowName] });
const estimate = await client.estimateGas({ account: sender, data: deploymentData });
const gasLimit = estimate + estimate / 20n;
const gasPrice = await client.getGasPrice();
const output = {
  status: "PREPARED_ONLY_NOT_DEPLOYED", chainId: 10143, core, forwarder, workflowOwner: owner,
  workflowName: name, encodedWorkflowName: workflowName, deploymentSender: sender,
  registryAuthority, deploymentData, estimatedGas: String(estimate), gasLimit: String(gasLimit),
  observedGasPriceWei: String(gasPrice), estimatedLimitFeeMON: formatEther(gasLimit * gasPrice),
  authorityNote: "Only the existing Core deployer can register this receiver. A new Safe cannot call that immutable-authority method on its behalf.",
  checksStillRequired: ["CRE tenant confirms production Monad testnet access and forwarder", "Linked owner matches report metadata", "Wallet approval of deployment", "Core deployer approval of registration", "Workflow activation and real settlement receipt"],
};
writeFileSync(new URL("./receiver-plan.local.json", import.meta.url), JSON.stringify(output, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify({ ...output, deploymentData: "Written to receiver-plan.local.json; not submitted." }, null, 2));

// If the receiver is already deployed, verify its immutable wiring before
// preparing registry calldata. A wrong receiver never gets an enable payload.
const receiver = process.env.BONDLINE_CRE_RECEIVER_ADDRESS;
if (receiver) {
  if (!validAddress(receiver) || !await client.getCode({ address: receiver })) throw Error("Receiver address has no code.");
  const fields = ["core", "forwarder", "workflowOwner", "workflowName"];
  const actual = await Promise.all(fields.map((functionName) => client.readContract({ address: receiver, abi: artifact.abi, functionName })));
  const expected = [core, forwarder, owner, workflowName];
  if (actual.some((value, i) => String(value).toLowerCase() !== expected[i].toLowerCase())) throw Error("Receiver immutable identity mismatch; registration was not prepared.");
  const data = encodeFunctionData({ abi: coreAbi, functionName: "setTrustedVerifier", args: [receiver, true] });
  writeFileSync(new URL("./registration-plan.local.json", import.meta.url), JSON.stringify({ chainId: 10143, from: registryAuthority, to: core, value: "0", data, receiver, status: "UNSIGNED_NOT_SUBMITTED" }, null, 2) + "\n", { mode: 0o600 });
  console.log("Verified receiver wiring; unsigned registry call written to registration-plan.local.json.");
}
