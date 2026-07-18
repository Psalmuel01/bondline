"use client";

import { useState } from "react";
import { shortAddr } from "@/lib/format";

export function ProfileName({ address, name, editable = false, onSave }: { address: `0x${string}`; name?: string; editable?: boolean; onSave?: (name: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name ?? "");
  const [saving, setSaving] = useState(false);

  if (!editable || !editing) return <button onClick={() => editable && setEditing(true)} className={editable ? "text-left hover:text-gold" : "text-left"} title={shortAddr(address)}>{name || shortAddr(address)}{editable && <span className="ml-1 text-faint">· edit</span>}</button>;

  return <form className="flex items-center gap-1" onSubmit={async (event) => { event.preventDefault(); if (!onSave || !value.trim()) return; setSaving(true); await onSave(value); setSaving(false); setEditing(false); }}>
    <input autoFocus maxLength={32} value={value} onChange={(event) => setValue(event.target.value)} className="w-28 rounded border border-gold/50 bg-bg px-1.5 py-0.5 text-xs text-bone outline-none" />
    <button disabled={saving} className="text-xs text-gold">{saving ? "…" : "Save"}</button>
  </form>;
}
