"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "./ConnectButton";
import { EmptyState } from "./ui/EmptyState";
import { monadMainnet } from "@/lib/chain";
import { CORE_ADDRESS } from "@/lib/contracts";
import { useBonds } from "@/lib/hooks";
import {
  encryptJournal,
  decryptJournal,
  journalStorageKey,
  parseJournalEnvelope,
  MAX_JOURNAL_BYTES,
  type JournalDocument,
  type JournalEnvelope,
  type JournalEntry,
} from "@/lib/journal";
import type { PasskeyCredentialMetadata } from "@category-labs/mera";

const empty: JournalDocument = { version: 1, entries: [] };
function JournalCommitmentPicker({ owner, value, disabled, onChange }: {
  owner: string;
  value: JournalEntry["commitment"];
  disabled: boolean;
  onChange: (value: JournalEntry["commitment"]) => void;
}) {
  const { bonds, isLoading, error } = useBonds();
  const own = bonds.filter((bond) => bond.creator.toLowerCase() === owner.toLowerCase());
  const selection = value ? `${value.core.toLowerCase()}:${value.id}` : "";
  const found = own.some((bond) => `${CORE_ADDRESS.toLowerCase()}:${bond.id}` === selection);
  return (
    <label className="mt-5 block text-sm">
      Commitment <span className="text-muted">(optional)</span>
      <select className="product-field mt-2" value={selection} disabled={disabled || isLoading}
        onChange={(event) => {
          const bond = own.find((item) => `${CORE_ADDRESS.toLowerCase()}:${item.id}` === event.target.value);
          onChange(bond ? { id: String(bond.id), core: CORE_ADDRESS } : undefined);
        }}>
        <option value="">No commitment · a general reflection</option>
        {value && !found && <option value={selection}>Saved commitment #{value.id}</option>}
        {own.map((bond) => <option key={String(bond.id)} value={`${CORE_ADDRESS.toLowerCase()}:${bond.id}`}>#{String(bond.id)} · {bond.description}</option>)}
      </select>
      <span className="mt-2 block text-xs text-muted">
        {error ? "Commitments could not load. Your saved link is preserved." : isLoading ? "Loading your commitments…" : "This connection and your note stay inside the encrypted journal. Your Circle cannot read them."}
      </span>
    </label>
  );
}
export function PrivateJournal() {
  const { address, connector } = useAccount();
  const [document, setDocument] = useState<JournalDocument | null>(null);
  const [envelope, setEnvelope] = useState<JournalEnvelope | null>(null);
  const [selected, setSelected] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const generation = useRef(0);
  const active = useRef({ busy, dirty });
  active.current = { busy, dirty };
  const key = address ? journalStorageKey(monadMainnet.id, address) : "";
  const rpId = () =>
    process.env.NEXT_PUBLIC_MERA_RP_ID || window.location.hostname;
  function credential(): PasskeyCredentialMetadata {
    const value = JSON.parse(
      localStorage.getItem("bondline.mera.credential.v1") || "null",
    );
    if (!value || typeof value.credentialId !== "string")
      throw new Error(
        "Return to this account with its original passkey first.",
      );
    return value;
  }
  function lock() {
    generation.current++;
    setDocument(null);
    setSelected(undefined);
    setDirty(false);
  }
  useEffect(() => {
    generation.current++;
    setDocument(null);
    setSelected(undefined);
    setDirty(false);
    setEnvelope(null);
    setError("");
    setNotice("");
    if (!address || connector?.id !== "mera") return;
    try {
      const raw = localStorage.getItem(key);
      if (raw)
        setEnvelope(
          parseJournalEnvelope(raw, address, monadMainnet.id, rpId()),
        );
    } catch {
      setError(
        "The saved journal could not be read. Import a valid encrypted backup; your stored file has not been overwritten.",
      );
    }
  }, [address, connector?.id, key]);
  useEffect(() => {
    const hide = () => {
      if (
        window.document.hidden &&
        !active.current.busy &&
        !active.current.dirty
      )
        lock();
    };
    const leave = (event: BeforeUnloadEvent) => {
      if (active.current.dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (
        !active.current.dirty ||
        !link ||
        link.getAttribute("target") === "_blank"
      )
        return;
      const destination = new URL(
        link.getAttribute("href")!,
        window.location.href,
      );
      if (
        destination.origin === window.location.origin &&
        destination.pathname === window.location.pathname
      )
        return;
      if (
        !window.confirm("Leave this page and discard unsaved journal changes?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.document.addEventListener("click", navigate, true);
    window.document.addEventListener("visibilitychange", hide);
    window.addEventListener("beforeunload", leave);
    return () => {
      generation.current++;
      window.document.removeEventListener("click", navigate, true);
      window.document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("beforeunload", leave);
    };
  }, []);
  async function unlock() {
    if (!address || busy) return;
    const current = generation.current;
    setBusy(true);
    setError("");
    try {
      // A new empty journal is encrypted immediately, proving PRF support before accepting notes.
      const saved =
        envelope ||
        (await encryptJournal(
          empty,
          address,
          monadMainnet.id,
          rpId(),
          credential(),
        ));
      const doc = envelope ? await decryptJournal(saved, credential()) : empty;
      if (current !== generation.current) return;
      if (!envelope) localStorage.setItem(key, JSON.stringify(saved));
      setEnvelope(saved);
      setDocument(doc);
      setSelected(doc.entries[0]?.id);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not open the journal.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!document || !address || busy) return;
    const current = generation.current;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = await encryptJournal(
        document,
        address,
        monadMainnet.id,
        rpId(),
        credential(),
      );
      if (current !== generation.current) return;
      localStorage.setItem(key, JSON.stringify(saved));
      setEnvelope(saved);
      setDirty(false);
      setNotice("Encrypted and saved on this device.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save; your notes remain open.",
      );
    } finally {
      setBusy(false);
    }
  }
  function add() {
    if (!document || document.entries.length >= 100) return;
    const now = new Date().toISOString();
    const entry = {
      id: crypto.randomUUID(),
      title: "",
      body: "",
      createdAt: now,
      updatedAt: now,
    };
    setDocument({ version: 1, entries: [entry, ...document.entries] });
    setSelected(entry.id);
    setDirty(true);
    setNotice("");
  }
  function change(field: "title" | "body", value: string) {
    if (!document) return;
    setDocument({
      version: 1,
      entries: document.entries.map((e) =>
        e.id === selected
          ? { ...e, [field]: value, updatedAt: new Date().toISOString() }
          : e,
      ),
    });
    setDirty(true);
    setNotice("");
  }
  function download() {
    if (!envelope) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(envelope)], { type: "application/json" }),
    );
    const a = window.document.createElement("a");
    a.href = url;
    a.download = "bondline-encrypted-journal.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function restore(file?: File) {
    if (!file || !address || busy) return;
    if (file.size > MAX_JOURNAL_BYTES) {
      setError("This backup is too large.");
      return;
    }
    const current = generation.current;
    setBusy(true);
    setError("");
    try {
      const candidate = parseJournalEnvelope(
        await file.text(),
        address,
        monadMainnet.id,
        rpId(),
      );
      const doc = await decryptJournal(candidate, credential());
      if (current !== generation.current) return;
      if (
        envelope &&
        !window.confirm(
          "Replace the journal on this device with this encrypted backup?",
        )
      )
        return;
      localStorage.setItem(key, JSON.stringify(candidate));
      setEnvelope(candidate);
      setDocument(doc);
      setSelected(doc.entries[0]?.id);
      setDirty(false);
      setNotice("Backup restored and unlocked.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not restore this backup.",
      );
    } finally {
      setBusy(false);
    }
  }
  const entry = document?.entries.find((e) => e.id === selected);
  if (!address)
    return (
      <EmptyState
        title="A private place to reflect"
        action={
          <ConnectButton intent="signin" label="Sign in with your passkey" />
        }
      >
        Keep personal notes about your goals, encrypted with your Mera passkey.
      </EmptyState>
    );
  if (connector?.id !== "mera")
    return (
      <EmptyState title="This journal needs a Mera passkey">
        Your browser wallet can use commitments and Circles. Journal encryption
        uses Mera’s passkey PRF, so it is available to passkey accounts.{" "}
        <Link href="/docs/private-journal" className="text-gold">
          How it works →
        </Link>
      </EmptyState>
    );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-gold">
            Your passkey. A separate encryption key.
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold">
            Private journal
          </h1>
          <p className="mt-3 text-sm text-muted">
            Reflect on your goals without posting to your Circle or the
            blockchain.
          </p>
        </div>
        {document && (
          <button
            disabled={busy}
            className="secondary-button"
            onClick={() => {
              if (!dirty || window.confirm("Lock and discard unsaved changes?"))
                lock();
            }}
          >
            Lock journal
          </button>
        )}
      </div>
      <p className="rounded-xl border border-line bg-panel p-4 text-xs leading-6 text-muted">
        Saved only on this device. Export an encrypted backup after saving.
        Clearing browser storage or losing the passkey can make your notes
        unrecoverable. Saved notes lock when you hide this page; unsaved notes
        stay open until saved or explicitly discarded.
      </p>
      {error && (
        <p role="alert" className="text-sm text-forfeit">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-confirm">
          {notice}
        </p>
      )}
      {!document ? (
        <EmptyState
          title={
            envelope
              ? "Your notes are locked"
              : "One passkey, more than an account"
          }
          action={
            <button disabled={busy} className="primary-button" onClick={unlock}>
              {busy
                ? "Confirm your passkey…"
                : envelope
                  ? "Unlock journal"
                  : "Create encrypted journal"}
            </button>
          }
        >
          Your passkey derives an encryption key distinct from the signing
          account. No gas, public transaction, or custody backend.
        </EmptyState>
      ) : (
        <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="space-y-3">
            <button
              disabled={busy || document.entries.length >= 100}
              onClick={add}
              className="secondary-button w-full"
            >
              ＋ New reflection
            </button>
            <nav aria-label="Journal entries" className="space-y-1">
              {document.entries.map((e) => (
                <button
                  key={e.id}
                  disabled={busy}
                  aria-pressed={selected === e.id}
                  onClick={() => setSelected(e.id)}
                  className={`w-full rounded-xl p-3 text-left text-sm ${selected === e.id ? "bg-panel-hi text-bone" : "text-muted hover:bg-panel"}`}
                >
                  <span className="block truncate">
                    {e.title || "Untitled reflection"}
                  </span>
                  <span className="mt-1 block text-[10px] text-faint">
                    {new Date(e.createdAt).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </nav>
          </aside>
          <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
            {entry ? (
              <>
                <label className="block text-sm">
                  Title
                  <input
                    maxLength={120}
                    disabled={busy}
                    value={entry.title}
                    onChange={(e) => change("title", e.target.value)}
                    className="product-field mt-2"
                    placeholder="What did you learn today?"
                  />
                </label>
                <JournalCommitmentPicker owner={address} value={entry.commitment} disabled={busy}
                  onChange={(commitment) => {
                    setDocument({ ...document, entries: document.entries.map((item) => item.id === entry.id
                      ? { ...item, commitment, updatedAt: new Date().toISOString() } : item) });
                    setDirty(true);
                    setNotice("");
                  }} />
                <label className="mt-5 block text-sm">
                  Your reflection
                  <textarea
                    maxLength={8000}
                    rows={9}
                    disabled={busy}
                    value={entry.body}
                    onChange={(e) => change("body", e.target.value)}
                    className="product-field mt-2 resize-y"
                    placeholder="What helped you follow through? What will you do differently?"
                  />
                </label>
                <div className="mt-5 flex flex-wrap justify-between gap-3">
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Delete this reflection? Save afterward to update the encrypted journal.",
                        )
                      ) {
                        setDocument({
                          version: 1,
                          entries: document.entries.filter(
                            (e) => e.id !== entry.id,
                          ),
                        });
                        setSelected(
                          document.entries.find((e) => e.id !== entry.id)?.id,
                        );
                        setDirty(true);
                      }
                    }}
                    className="text-xs text-muted hover:text-forfeit"
                  >
                    Delete reflection
                  </button>
                </div>
              </>
            ) : (
              <EmptyState
                title="A little space to think"
                action={
                  <button onClick={add} className="primary-button">
                    Write your first reflection
                  </button>
                }
              >
                Private notes can hold the context your public history cannot.
              </EmptyState>
            )}
          </section>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-5">
        {document && (
          <button
            disabled={busy || !dirty}
            onClick={save}
            className="primary-button"
          >
            {busy ? "Confirm your passkey…" : "Encrypt & save"}
          </button>
        )}
        <button
          disabled={!envelope || dirty || busy}
          onClick={download}
          className="secondary-button"
        >
          Export encrypted backup
        </button>
        <label className="secondary-button cursor-pointer focus-within:ring-2 focus-within:ring-gold">
          Import backup
          <input
            className="sr-only"
            type="file"
            accept="application/json,.json"
            disabled={busy || dirty}
            onChange={(e) => void restore(e.target.files?.[0])}
          />
        </label>
        <Link href="/docs/private-journal" className="text-sm text-gold">
          Encryption & recovery →
        </Link>
        {dirty && (
          <span className="text-xs text-muted">
            Save before exporting or importing.
          </span>
        )}
      </div>
    </div>
  );
}
