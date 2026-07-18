"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain, useChainId } from "wagmi";
import { monadTestnet } from "@/lib/chain";
import { shortAddr } from "@/lib/format";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();

  const injected = connectors.find((c) => c.type === "injected") ?? connectors[0];
  const wrongChain = isConnected && chainId !== monadTestnet.id;

  if (!isConnected) {
    return (
      <button
        onClick={() => injected && connect({ connector: injected })}
        disabled={isPending}
        className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-108 disabled:opacity-50"
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  if (wrongChain) {
    return (
      <button
        onClick={() => switchChain({ chainId: monadTestnet.id })}
        className="rounded-md border border-forfeit/50 bg-forfeit/10 px-4 py-2 text-sm font-medium text-forfeit transition hover:bg-forfeit/20"
      >
        Switch to Monad Testnet
      </button>
    );
  }

  return (
    <button
      onClick={() => disconnect()}
      className="tnum rounded-md border border-line bg-panel px-4 py-2 text-sm text-muted transition hover:text-bone"
      title="Disconnect"
    >
      {shortAddr(address)}
    </button>
  );
}
