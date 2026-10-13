import { createWalletClient, http, isAddress, type Address, type Hex, type LocalAccount, type PublicClient, type Chain } from "viem";

/** Prepare with standard RPCs, preserving the wallet request and bounding fees before signing. */
export async function prepareMeraTransaction(client: PublicClient, chain: Chain, address: Address, tx: Record<string, Hex>) {
  if (!tx.to || !isAddress(tx.to)) throw new Error("The transaction destination is missing or invalid.");
  if (tx.from && tx.from.toLowerCase() !== address.toLowerCase()) throw new Error("Account does not match.");
  if (tx.chainId && Number(BigInt(tx.chainId)) !== chain.id) throw new Error("The transaction uses the wrong network.");
  if (await client.getChainId() !== chain.id) throw new Error("The account RPC is configured for the wrong network.");
  const value = tx.value ? BigInt(tx.value) : 0n;
  const data = tx.data ?? tx.input;
  const gas = tx.gas ? BigInt(tx.gas) : await client.estimateGas({ account: address, to: tx.to, data, value }).then((estimate) => estimate + estimate / 20n);
  const nonce = tx.nonce ? Number(BigInt(tx.nonce)) : await client.getTransactionCount({ address, blockTag: "pending" });
  const fees = tx.gasPrice
    ? { gasPrice: BigInt(tx.gasPrice), type: "legacy" as const }
    : { ...(tx.maxFeePerGas && tx.maxPriorityFeePerGas ? { maxFeePerGas: BigInt(tx.maxFeePerGas), maxPriorityFeePerGas: BigInt(tx.maxPriorityFeePerGas) } : await client.estimateFeesPerGas()), type: "eip1559" as const };
  const feeCap = "gasPrice" in fees ? fees.gasPrice! : fees.maxFeePerGas!;
  const balance = await client.getBalance({ address });
  if (balance < value + gas * feeCap) throw new Error(`Your account needs more ${chain.testnet ? "test " : ""}MON to cover this action. Add funds to the address in your account panel and retry.`);
  return { to: tx.to, data, value, gas, nonce, chainId: chain.id, ...fees };
}

export async function sendMeraTransaction(account: LocalAccount, chain: Chain, rpc: string | undefined, transaction: Awaited<ReturnType<typeof prepareMeraTransaction>>) {
  const wallet = createWalletClient({ account, chain, transport: http(rpc) });
  // All fields are explicit: no eth_fillTransaction dependency or discarded nonce/fee fields.
  return wallet.sendTransaction(transaction);
}
