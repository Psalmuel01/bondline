"use client";
import Link from "next/link";
import { useState } from "react";
import type { Circle } from "@/lib/contracts";
import { Modal } from "./ui/Modal";
import { EmptyState } from "./ui/EmptyState";
import { OpenBond } from "./OpenBond";
export function CommitmentLauncher({
  circles,
  loading = false,
  onCreated,
}: {
  circles: Circle[];
  loading?: boolean;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>();
  const circle = circles.find(
    (c) => c.address.toLowerCase() === selected?.toLowerCase(),
  );
  return (
    <>
      <button
        disabled={loading}
        onClick={() => {
          setSelected(undefined);
          setOpen(true);
        }}
        className="primary-button"
      >
        ＋ Make a commitment
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={circle ? `Commit to ${circle.name}` : "Choose your Circle"}
      >
        {circle ? (
          <>
            <button
              onClick={() => setSelected(undefined)}
              className="mx-6 mt-4 text-xs text-muted hover:text-gold"
            >
              ← Choose another Circle
            </button>
            <OpenBond
              circle={circle}
              onCreated={() => {
                setOpen(false);
                onCreated();
              }}
            />
          </>
        ) : (
          <div className="space-y-3 p-6">
            {loading ? (
              <p className="text-sm text-muted">Loading your Circles…</p>
            ) : circles.length ? (
              circles.map((c) => (
                <button
                  key={c.address}
                  onClick={() => setSelected(c.address)}
                  className="motion-card flex w-full items-center justify-between gap-4 rounded-xl border border-line p-4 text-left text-sm hover:border-gold/40"
                >
                  <span>{c.name}</span>
                  <span className="text-gold">Choose →</span>
                </button>
              ))
            ) : (
              <EmptyState
                title="Start with your people"
                action={
                  <Link
                    href="/"
                    onClick={() => setOpen(false)}
                    className="primary-button"
                  >
                    Create or join a Circle →
                  </Link>
                }
              >
                You need to belong to a Circle before committing a stake.
              </EmptyState>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
