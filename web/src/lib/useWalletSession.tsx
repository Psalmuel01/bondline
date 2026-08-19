"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";

type WalletSessionState = {
  authenticatedAddress?: `0x${string}`;
  isAuthenticated: boolean;
  isChecking: boolean;
  isSigningIn: boolean;
  error?: string;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const WalletSessionContext = createContext<WalletSessionState | undefined>(undefined);

async function json<T>(response: Response): Promise<T> {
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((value as { error?: string }).error ?? "Request failed.");
  return value as T;
}

export function WalletSessionProvider({ children }: { children: React.ReactNode }) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [authenticatedAddress, setAuthenticatedAddress] = useState<`0x${string}`>();
  const [isChecking, setIsChecking] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string>();

  const signOut = useCallback(async () => {
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
    setAuthenticatedAddress(undefined);
  }, []);

  useEffect(() => {
    let active = true;
    setIsChecking(true);
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => json<{ address: `0x${string}` } | null>(response))
      .then((session) => {
        if (!active) return;
        const matches = session?.address.toLowerCase() === address?.toLowerCase();
        setAuthenticatedAddress(matches ? session?.address : undefined);
        if (session && address && !matches) void signOut();
      })
      .catch(() => { if (active) setAuthenticatedAddress(undefined); })
      .finally(() => { if (active) setIsChecking(false); });
    return () => { active = false; };
  }, [address, signOut]);

  const signIn = useCallback(async () => {
    if (!address) throw new Error("Connect your wallet first.");
    setIsSigningIn(true);
    setError(undefined);
    try {
      const challenge = await json<{ message: string }>(await fetch("/api/auth/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      }));
      const signature = await signMessageAsync({ message: challenge.message });
      const session = await json<{ address: `0x${string}` }>(await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, message: challenge.message, signature }),
      }));
      setAuthenticatedAddress(session.address);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Couldn’t sign in.";
      setError(message);
      throw cause;
    } finally {
      setIsSigningIn(false);
    }
  }, [address, signMessageAsync]);

  const value = useMemo<WalletSessionState>(() => ({
    authenticatedAddress,
    isAuthenticated: Boolean(address && authenticatedAddress?.toLowerCase() === address.toLowerCase()),
    isChecking,
    isSigningIn,
    error,
    signIn,
    signOut,
  }), [address, authenticatedAddress, error, isChecking, isSigningIn, signIn, signOut]);

  return <WalletSessionContext.Provider value={value}>{children}</WalletSessionContext.Provider>;
}

export function useWalletSession() {
  const value = useContext(WalletSessionContext);
  if (!value) throw new Error("useWalletSession must be used inside WalletSessionProvider.");
  return value;
}
