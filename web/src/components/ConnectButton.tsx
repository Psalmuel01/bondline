"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useConnect, useAccount, useDisconnect, useBalance } from "wagmi";
import { createMeraAccountOnNextConnect } from "@/lib/mera";
import { externalWalletsEnabled } from "@/lib/wagmi";
import { useWalletSession } from "@/lib/useWalletSession";
import { formatMon, shortAddr } from "@/lib/format";
import { explorerAddr, monadMainnet } from "@/lib/chain";

export function ConnectButton() {
  const { address, isConnected, connector } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { signOut } = useWalletSession();
  const balance = useBalance({ address, chainId: monadMainnet.id, query: { enabled: !!address, refetchInterval: 15000 } });
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);
  const passkey = connectors.find((c) => c.id === "mera");
  const injectedWallets = externalWalletsEnabled ? connectors.filter((c) => c.type === "injected") : [];
  const discoveredWallets = injectedWallets.filter((c) => c.id !== "injected");
  const walletOptions = discoveredWallets.length > 0 ? discoveredWallets : injectedWallets;
  function close() { dialog.current?.close(); setError(undefined); }
  async function openAccount(create: boolean, wallet?: (typeof connectors)[number]) {
    setError(undefined);
    const selected = wallet ?? passkey;
    if (!selected) { setError("This account option is not available."); return; }
    try {
      if (create) createMeraAccountOnNextConnect();
      if (wallet && !(await selected.getProvider())) {
        setError("No browser wallet was detected. Open or unlock MetaMask or Brave Wallet, then try again.");
        return;
      }
      await connectAsync({ connector: selected, chainId: monadMainnet.id });
      dialog.current?.close();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      if (wallet) {
        if (/user rejected|user denied|UserRejectedRequest|4001/i.test(message)) setError("Connection cancelled. Try again when you’re ready.");
        else if (/already pending|request.*pending|-32002/i.test(message)) setError("Your wallet already has a request waiting. Open it and approve or dismiss that request first.");
        else if (/ProviderNotFound|provider.*not found|provider.*unavailable/i.test(message)) setError("No browser wallet was detected. Open or unlock your wallet, then try again.");
        else if (/chain|network|switch/i.test(message)) setError(`Allow your wallet to use ${monadMainnet.name}, then try again.`);
        else setError("Could not connect this wallet. Open and unlock it, then retry. " + message.split("\n")[0].slice(0, 100));
        return;
      }
      setError(/PRF/i.test(message)
        ? "This passkey provider is not supported. Try iCloud Keychain, Google Password Manager, or 1Password."
        : "Could not open your account. Try again with your Bondline passkey.");
    }
  }
  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2500);
    } catch { setError("Copy is unavailable. Select and copy the address below."); }
  }
  async function leave() {
    await signOut();
    disconnect();
    close();
  }
  return <>
    <button onClick={() => { setError(undefined); dialog.current?.showModal(); }} aria-haspopup="dialog" className={isConnected ? "inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-2 text-sm text-bone transition hover:border-gold/50" : "rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110"}>
      {isConnected && address ? <><span className="h-2 w-2 rounded-full bg-confirm" /><span className="tnum">{shortAddr(address)}</span></> : "Get started"}
    </button>
    <dialog ref={dialog} aria-labelledby="account-title" onClick={(event) => { if (event.target === dialog.current) close(); }} className="fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-sm overflow-y-auto rounded-2xl border border-line bg-panel p-0 text-bone shadow-2xl backdrop:bg-black/65 backdrop:backdrop-blur-sm">
      <div className="p-6">
        <div className="mb-5 flex items-center justify-between gap-4"><h2 id="account-title" className="font-display text-xl font-semibold">{isConnected ? "Your account" : "Welcome to Bondline"}</h2><button onClick={close} aria-label="Close account panel" className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-muted transition hover:bg-panel-hi hover:text-bone">×</button></div>
        {isConnected && address ? <>
          <p className="text-xs text-muted">{connector?.id === "mera" ? "Secured with your passkey" : "Your connected account"} · {monadMainnet.testnet ? "Testnet" : "Mainnet"}</p>
          <div className="mt-5 rounded-xl border border-line bg-bg p-4">
            <p className="text-xs text-muted">Available balance</p><p className="tnum mt-1 text-2xl font-semibold">{balance.isError ? "Unavailable" : balance.data ? `${formatMon(balance.data.value)} MON` : "Loading…"}</p>
            <p className="mt-4 text-xs text-muted">Your account address</p><p className="tnum mt-2 select-all break-all text-xs leading-6 text-bone">{address}</p>
            <div className="mt-3 flex items-center gap-4"><button onClick={copyAddress} className="text-sm font-medium text-gold">{copied ? "Copied ✓" : "Copy address"}</button><a href={explorerAddr(address)} target="_blank" rel="noreferrer" className="text-xs text-muted hover:text-bone">View activity ↗</a></div>
            <span aria-live="polite" className="sr-only">{copied ? "Account address copied" : ""}</span>
          </div>
          {monadMainnet.testnet && <p className="mt-3 text-xs leading-relaxed text-muted">Use this address to receive test MON for your commitments. Test MON has no cash value.</p>}
          <div className="my-5 flex flex-col gap-3 border-y border-line py-4"><Link onClick={close} href="/profile" className="text-sm hover:text-gold">Your commitment history →</Link><Link onClick={close} href="/analytics" className="text-sm text-muted hover:text-gold">Product activity →</Link><Link onClick={close} href="/docs" className="text-sm text-muted hover:text-gold">How it works →</Link></div>
          <button onClick={leave} className="text-sm text-muted hover:text-bone">Sign out</button>
        </> : <>
          <p className="mb-6 text-sm leading-relaxed text-muted">Put weight behind your promises. Your passkey opens your account with Face ID, Touch ID, or your device lock.</p>
          <button disabled={isPending} onClick={() => openAccount(true)} className="w-full rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-ink disabled:opacity-50">{isPending ? "Opening your account…" : "Create an account"}</button>
          <p className="mt-2 text-center text-xs text-muted">Creates a new passkey and a new account.</p>
          <div className="mt-6 border-t border-line pt-4"><p className="mb-3 text-sm text-muted">Already have a Bondline passkey?</p><button disabled={isPending} onClick={() => openAccount(false)} className="w-full rounded-xl border border-line px-4 py-3 text-sm font-medium transition hover:border-gold/50 disabled:opacity-50">Sign in with your passkey</button></div>
          {externalWalletsEnabled && <details className="mt-5 text-xs text-muted"><summary className="cursor-pointer">Use an existing wallet</summary><p className="mt-3 leading-relaxed">Choose your browser wallet. It will ask to connect to {monadMainnet.name}.</p><div className="mt-3 flex flex-col gap-2">{walletOptions.map((wallet) => <button key={wallet.uid} disabled={isPending} onClick={() => openAccount(false, wallet)} className="rounded-lg border border-line px-3 py-2 text-left text-sm text-gold disabled:opacity-50">{wallet.id === "injected" ? "Browser wallet (MetaMask / Brave)" : wallet.name}</button>)}{!walletOptions.length && <p className="text-xs text-muted">Open a browser with MetaMask or Brave Wallet enabled, then reload this page.</p>}</div></details>}
        </>}
        {error && <p role="alert" className="mt-4 text-sm leading-relaxed text-forfeit">{error}</p>}
      </div>
    </dialog>
  </>;
}
