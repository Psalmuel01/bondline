import { monad, monadTestnet } from "viem/chains";

// Legacy export name retained so every explorer / server / wallet uses one configured chain.
export const monadMainnet = process.env.NEXT_PUBLIC_CHAIN_ID === "10143" ? monadTestnet : monad;
export const explorerTx = (hash: string) => `${monadMainnet.blockExplorers.default.url}/tx/${hash}`;
export const explorerAddr = (addr: string) => `${monadMainnet.blockExplorers.default.url}/address/${addr}`;
