"use client";
import Link from "next/link";
import { useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { useProfiles } from "@/lib/useProfiles";
import { useWalletSession } from "@/lib/useWalletSession";
import { usePreferences } from "@/lib/usePreferences";
import { monadMainnet, explorerAddr } from "@/lib/chain";
import { formatMon } from "@/lib/format";
import { ProfileName } from "./ProfileName";
import { Avatar } from "./Avatar";
import { ConnectButton } from "./ConnectButton";
import { OnboardingGuide } from "./OnboardingGuide";
import { EmptyState } from "./ui/EmptyState";
import { SectionHeading } from "./ui/SectionHeading";
export function SettingsExperience() {
  const { address, connector } = useAccount();
  const { profiles, save, enabled } = useProfiles(address ? [address] : []);
  const { isAuthenticated, signIn, isSigningIn } = useWalletSession();
  const {
    preferences,
    ready,
    update,
    reset,
    error: preferenceError,
  } = usePreferences();
  const balance = useBalance({
    address,
    chainId: monadMainnet.id,
    query: { enabled: !!address },
  });
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function download() {
    setExporting(true);
    setError("");
    try {
      if (!isAuthenticated) await signIn();
      const response = await fetch("/api/account/export", {
        cache: "no-store",
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Export unavailable.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "bondline-account-export.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        "Your export was downloaded. Keep it private: it includes messages you authored.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Export unavailable.");
    } finally {
      setExporting(false);
    }
  }
  if (!address)
    return (
      <EmptyState
        title="Settings for your account"
        action={<ConnectButton intent="signin" label="Sign in" />}
      >
        Sign in to edit your identity and manage device preferences.
      </EmptyState>
    );
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav
        aria-label="Settings sections"
        className="flex gap-2 overflow-x-auto text-sm lg:sticky lg:top-6 lg:flex-col"
      >
        {[
          ["profile", "Profile"],
          ["account", "Account & passkey"],
          ["notifications", "Notifications"],
          ["privacy", "Privacy"],
          ["integrations", "Verification"],
          ["help", "Help"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="workspace-tab justify-start">
            {label}
          </a>
        ))}
      </nav>
      <div className="space-y-8">
        <section
          id="profile"
          className="scroll-mt-6 rounded-2xl border border-line bg-panel p-6"
        >
          <SectionHeading
            title="Your profile"
            description="Make your address recognizable to your Circle."
          />
          <div className="mt-5 flex items-center gap-4">
            <Avatar
              addr={address}
              size={52}
              imageUrl={profiles[address.toLowerCase()]?.avatar_url}
              color={profiles[address.toLowerCase()]?.avatar_color}
            />
            <div>
              <ProfileName
                address={address}
                profile={profiles[address.toLowerCase()]}
                editable={enabled}
                onSave={(profile) => save(address, profile)}
              />
              <p className="mt-2 text-xs text-muted">
                Click your name to edit your display name, photo, and color.
              </p>
            </div>
          </div>
        </section>
        <section
          id="account"
          className="scroll-mt-6 rounded-2xl border border-line bg-panel p-6"
        >
          <SectionHeading
            title="Account & passkey"
            description="Your signing account and the network it uses."
          />
          <p className="tnum mt-5 break-all rounded-xl bg-bg p-4 text-xs leading-6">
            {address}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              className="secondary-button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(address);
                  setCopied(true);
                } catch {
                  setError(
                    "Copy is unavailable. Select the address above to copy it.",
                  );
                }
              }}
            >
              {copied ? "Copied ✓" : "Copy address"}
            </button>
            <a
              href={explorerAddr(address)}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-gold"
            >
              View account ↗
            </a>
            <span className="text-sm text-muted">
              {balance.data
                ? `${formatMon(balance.data.value)} MON`
                : balance.isError
                  ? "Balance unavailable"
                  : "Loading balance…"}{" "}
              · {monadMainnet.name}
            </span>
          </div>
          <p className="mt-5 text-sm leading-7 text-muted">
            {connector?.id === "mera"
              ? "Secured with your Mera passkey. Use the same passkey and stable domain to return to this address. Bondline cannot recover a lost credential; recovery depends on your password manager or device provider."
              : "Secured with your connected browser wallet. Wallet recovery and account switching are managed in that wallet."}
          </p>
          <div className="mt-5">
            <ConnectButton />
          </div>
          <p className="mt-3 text-xs text-faint">
            Open the account menu to sign out. Bondline does not expose a
            private-key export or passkey-reset button.
          </p>
        </section>
        <section
          id="notifications"
          className="scroll-mt-6 rounded-2xl border border-line bg-panel p-6"
        >
          <SectionHeading
            title="Notifications"
            description="Choose the updates shown in your notification center on this device."
          />
          <div className="mt-5 divide-y divide-line">
            {[
              [
                "deadlines",
                "Approaching deadlines",
                "Your active commitments due within 24 hours.",
              ],
              [
                "evidence",
                "Evidence ready for review",
                "Eligible evidence reviews that still need your response.",
              ],
              [
                "activity",
                "Backing and outcomes",
                "Recent backing, completed or missed commitments, and Circle reward updates.",
              ],
            ].map(([key, title, body]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between gap-5 py-4"
              >
                <span>
                  <span className="text-sm font-medium">{title}</span>
                  <span className="mt-1 block text-xs text-muted">{body}</span>
                </span>
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0 accent-gold"
                  checked={Boolean(
                    preferences[key as "deadlines" | "evidence" | "activity"],
                  )}
                  disabled={!ready}
                  onChange={(e) => update({ [key]: e.target.checked })}
                />
              </label>
            ))}
          </div>
          <p className="mt-4 text-xs leading-6 text-faint">
            These controls affect in-app notices only. Email, SMS, and push
            notifications are not provided. Preferences and read state stay on
            this device.
          </p>
          {preferenceError && (
            <p role="alert" className="mt-3 text-sm text-forfeit">
              {preferenceError}
            </p>
          )}
        </section>
        <section
          id="privacy"
          className="scroll-mt-6 rounded-2xl border border-line bg-panel p-6"
        >
          <SectionHeading title="Privacy & your information" />
          <p className="mt-4 text-sm leading-7 text-muted">
            Chat is membership-protected, not end-to-end encrypted. Profiles and
            images are public; blockchain records cannot be erased by this
            application. The export includes your profile and up to your latest
            2,000 authored messages, never other members’ messages or signing
            material.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="primary-button"
              disabled={exporting || isSigningIn}
              onClick={() => void download()}
            >
              {exporting ? "Preparing export…" : "Download your information"}
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                reset();
                setNotice(
                  "Device preferences and notification read state were reset. Your passkey and on-chain history were not changed.",
                );
              }}
            >
              Reset device preferences
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-4 text-sm text-gold">
            <Link href="/journal">Private journal →</Link>
            <Link href="/privacy">Privacy notice ↗</Link>
            <Link href="/contact">Data removal questions ↗</Link>
          </div>
          {notice && (
            <p role="status" className="mt-4 text-sm text-confirm">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm text-forfeit">
              {error}
            </p>
          )}
        </section>
        <section
          id="integrations"
          className="scroll-mt-6 rounded-2xl border border-line bg-panel p-6"
        >
          <SectionHeading
            title="Verification providers"
            description="Availability follows the deployment, not a cosmetic toggle."
          />
          <ul className="mt-5 space-y-4 text-sm">
            <li className="flex justify-between gap-4">
              <span>Circle evidence review</span>
              <span className="text-confirm">Available</span>
            </li>
            <li className="flex justify-between gap-4">
              <span>On-chain MON balance</span>
              <span className="text-confirm">Available</span>
            </li>
            <li className="flex justify-between gap-4">
              <span>GitHub worker</span>
              <span className="text-muted">
                {process.env.NEXT_PUBLIC_EXTERNAL_VERIFIER_ADDRESS
                  ? "Address configured · worker required"
                  : "Not configured"}
              </span>
            </li>
          </ul>
          <p className="mt-5 text-xs leading-6 text-muted">
            A configured worker address does not establish uptime. Fitness,
            learning, and CRE production workflows are not active.
          </p>
          <Link
            href="/docs/verification"
            className="mt-4 inline-block text-sm text-gold"
          >
            Understand each rule →
          </Link>
        </section>
        <section
          id="help"
          className="scroll-mt-6 rounded-2xl border border-line bg-panel p-6"
        >
          <SectionHeading
            title="A little guidance"
            description="Return to the basics whenever you need them."
          />
          <div className="mt-5 flex flex-wrap gap-3">
            <OnboardingGuide />
            <Link href="/docs" className="secondary-button">
              Documentation →
            </Link>
            <Link href="/contact" className="secondary-button">
              Contact →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
