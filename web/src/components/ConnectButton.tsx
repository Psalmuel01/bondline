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
        className="rounded-md border border-live/40 bg-live/10 px-4 py-2 text-sm font-medium text-live transition hover:bg-live/20 disabled:opacity-50"
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  if (wrongChain) {
    return (
      <button
        onClick={() => switchChain({ chainId: monadTestnet.id })}
        className="rounded-md border border-gone/50 bg-gone/10 px-4 py-2 text-sm font-medium text-gone transition hover:bg-gone/20"
      >
        Switch to Monad Testnet
      </button>
    );
  }

  return (
    <button
      onClick={() => disconnect()}
      className="tnum rounded-md border border-line bg-panel px-4 py-2 text-sm text-muted transition hover:text-text"
      title="Disconnect"
    >
      {shortAddr(address)}
    </button>
  );
}
