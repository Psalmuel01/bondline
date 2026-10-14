"use client";

import { Modal } from "./ui/Modal";
import { useState } from "react";
import { useAccount } from "wagmi";
import type { Circle } from "@/lib/contracts";
import {
  deleteCircleImage,
  getCircleMetadata,
  isSupabaseConfigured,
  saveCircleMetadata,
  uploadCircleImage,
  type CircleMetadata,
} from "@/lib/supabase";
import { useWalletSession } from "@/lib/useWalletSession";

export function CircleSettings({
  circle,
  metadata,
  onMetadata,
}: {
  circle: Circle;
  metadata?: CircleMetadata;
  onMetadata: (metadata: CircleMetadata | undefined) => void;
}) {
  const { address } = useAccount();
  const { isAuthenticated, isSigningIn, signIn } = useWalletSession();
  const [open, setOpen] = useState(false);
  const [mission, setMission] = useState("");
  const [potGoal, setPotGoal] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const isMember =
    !!address &&
    circle.members.some(
      (member) => member.toLowerCase() === address.toLowerCase(),
    );

  if (!isSupabaseConfigured || !isMember) return null;

  function openSettings() {
    setMission(metadata?.mission || "");
    setPotGoal(metadata?.pot_goal || "");
    setBannerUrl(metadata?.banner_url || "");
    setError("");
    setOpen(true);
  }

  async function uploadBanner(file?: File) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      if (!isAuthenticated) await signIn();
      setBannerUrl(await uploadCircleImage(file, "banner", circle.address));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Couldn’t upload this image.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (uploading || saving) return;
    if (
      potGoal &&
      (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(potGoal) ||
        !Number.isFinite(Number(potGoal)) ||
        Number(potGoal) <= 0)
    ) {
      setError("Enter a positive MON amount, or leave the Pot goal empty.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (!isAuthenticated) await signIn();
      const previousUrl = metadata?.banner_url ?? "";
      await saveCircleMetadata(circle.address, { mission, potGoal, bannerUrl });
      if (previousUrl && previousUrl !== bannerUrl)
        await deleteCircleImage(previousUrl);
      onMetadata(await getCircleMetadata(circle.address));
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Couldn’t save Circle details.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={openSettings}
        className="secondary-button"
        aria-label="Edit Circle settings"
      >
        Settings
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Circle settings">
        <form onSubmit={submit} className="w-full">
          <div className="space-y-6 p-5 sm:p-6">
            <p className="text-sm leading-6 text-muted">
              Give your Circle a shared purpose. Any member can edit these
              details.
            </p>
            <label className="block">
              <span className="text-sm font-medium">Circle mission</span>
              <textarea
                autoFocus
                maxLength={120}
                rows={2}
                value={mission}
                onChange={(event) => setMission(event.target.value)}
                placeholder="What are you working toward together?"
                className="product-field mt-2 resize-none"
              />
              <span className="mt-1 flex justify-between text-[11px] text-faint">
                <span>A short description shown on your Circle.</span>
                <span>{mission.length}/120</span>
              </span>
            </label>
            <label className="block">
              <span className="text-sm font-medium">
                Pot goal{" "}
                <span className="font-normal text-faint">· optional</span>
              </span>
              <div className="relative mt-2">
                <input
                  inputMode="decimal"
                  value={potGoal}
                  onChange={(event) =>
                    setPotGoal(event.target.value.replace(/[^0-9.]/g, ""))
                  }
                  placeholder="e.g. 10"
                  className="product-field tnum pr-16"
                />
                <span className="pointer-events-none absolute right-4 top-4 text-xs text-muted">
                  MON
                </span>
              </div>
              <span className="mt-2 block text-[11px] leading-5 text-faint">
                A display target only. This doesn’t change stakes or reward
                rules.
              </span>
            </label>
            <div>
              <p className="text-sm font-medium">
                Circle cover{" "}
                <span className="font-normal text-faint">· optional</span>
              </p>
              {bannerUrl && (
                <img
                  src={bannerUrl}
                  alt="Circle cover preview"
                  className="mt-3 h-28 w-full rounded-xl border border-line object-cover"
                />
              )}
              <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line bg-bg/50 p-4 hover:border-gold/50 focus-within:border-gold focus-within:ring-1 focus-within:ring-gold">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-panel-hi text-gold"
                >
                  ↑
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">
                    {uploading
                      ? "Uploading…"
                      : bannerUrl
                        ? "Replace cover image"
                        : "Choose a cover image"}
                  </span>
                  <span className="mt-1 block text-[11px] text-faint">
                    JPG, PNG, WebP, or GIF · up to 5 MB
                  </span>
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={uploading || saving}
                  onChange={(event) =>
                    void uploadBanner(event.target.files?.[0])
                  }
                  className="sr-only"
                />
              </label>
              {bannerUrl && (
                <button
                  type="button"
                  onClick={() => setBannerUrl("")}
                  className="mt-2 text-xs text-muted hover:text-forfeit"
                >
                  Remove cover
                </button>
              )}
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-forfeit/20 bg-forfeit/5 p-3 text-sm text-forfeit"
              >
                {error}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3 border-t border-line bg-bg/30 px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={saving || uploading || isSigningIn}
              className="secondary-button"
            >
              Cancel
            </button>
            <button
              disabled={saving || uploading || isSigningIn}
              className="primary-button"
            >
              {isSigningIn
                ? "Confirm your account…"
                : uploading
                  ? "Uploading…"
                  : saving
                    ? "Saving…"
                    : "Save changes"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
