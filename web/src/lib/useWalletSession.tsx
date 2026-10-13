"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";

import { authenticateWallet } from "./wallet-auth";

type WalletSessionState = {
  authenticatedAddress?: `0x${string}`;
  isAuthenticated: boolean;
  isChecking: boolean;
  isSigningIn: boolean;
  error?: string;
  signIn: (account?: `0x${string}`) => Promise<void>;
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

  const signIn = useCallback(async (account = address) => {
    if (!account) throw new Error("Connect your account first.");
    setIsSigningIn(true);
    setError(undefined);
    try {
      const authenticated = await authenticateWallet(account, (message) => signMessageAsync({ account, message }));
      setAuthenticatedAddress(authenticated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn’t sign in.");
      throw cause;
    } finally { setIsSigningIn(false); }
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
