"use client";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "../ConnectButton";
export function StartCTA() {
  const { isConnected } = useAccount();
  return isConnected ? (
    <Link className="primary-button" href="/">
      Open your dashboard →
    </Link>
  ) : (
    <ConnectButton />
  );
}
