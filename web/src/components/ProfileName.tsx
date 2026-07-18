"use client";

import { useState } from "react";
import type { ProfileRow } from "@/lib/supabase";
import { shortAddr } from "@/lib/format";

const COLORS = ["#514332", "#3d4f6a", "#4d3b5f", "#265344", "#6a3f31"];

export function ProfileName({ address, profile, editable = false, onSave }: { address: `0x${string}`; profile?: ProfileRow; editable?: boolean; onSave?: (profile: { displayName: string; avatarUrl?: string; avatarColor: string }) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(profile?.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [color, setColor] = useState(profile?.avatar_color ?? COLORS[0]);
  const [saving, setSaving] = useState(false);
  const label = profile?.display_name || shortAddr(address);

  return <>
    <button onClick={() => editable && setOpen(true)} className={editable ? "group flex items-center gap-1 text-left hover:text-gold" : "flex items-center gap-1 text-left"} title={shortAddr(address)}>
      {label}{editable && <span className="text-faint transition group-hover:text-gold">· edit profile</span>}
    </button>
    {open && <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/65 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="Edit profile">
      <form onSubmit={async (event) => { event.preventDefault(); if (!onSave || !name.trim()) return; setSaving(true); await onSave({ displayName: name, avatarUrl, avatarColor: color }); setSaving(false); setOpen(false); }} className="w-full max-w-xl rounded-2xl border border-panel-hi bg-panel p-6 shadow-2xl shadow-black/30 sm:p-7">
        <div className="flex items-start justify-between"><div><p className="tnum text-[10px] uppercase tracking-widest text-gold">Your Bondline profile</p><h2 className="font-display mt-1 text-xl font-semibold text-bone">Make your address human.</h2></div><button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-bone">×</button></div>
        <div className="mt-6 flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full text-lg font-semibold text-bone" style={{ background: color }}>{avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : name.slice(0, 1).toUpperCase()}</div><div><p className="text-sm text-bone">{name || "Your name"}</p><p className="tnum text-xs text-faint">{shortAddr(address)}</p></div></div>
        <label className="mt-5 flex flex-col gap-1.5"><span className="text-xs uppercase tracking-widest text-faint">Display name</span><input autoFocus maxLength={32} value={name} onChange={(event) => setName(event.target.value)} placeholder="Sam" className="rounded-md border border-line bg-bg px-3 py-2.5 text-sm text-bone outline-none focus:border-gold/50" /></label>
        <label className="mt-4 flex flex-col gap-1.5"><span className="text-xs uppercase tracking-widest text-faint">Photo URL <span className="normal-case tracking-normal">(optional)</span></span><input type="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://…" className="rounded-md border border-line bg-bg px-3 py-2.5 text-sm text-bone outline-none focus:border-gold/50" /></label>
        <div className="mt-4"><span className="text-xs uppercase tracking-widest text-faint">Avatar color</span><div className="mt-2 flex gap-2">{COLORS.map((candidate) => <button type="button" key={candidate} onClick={() => setColor(candidate)} className={`h-7 w-7 rounded-full border-2 ${color === candidate ? "border-gold" : "border-transparent"}`} style={{ background: candidate }} />)}</div></div>
        <button disabled={saving || !name.trim()} className="mt-6 w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-40">{saving ? "Saving…" : "Save profile"}</button>
      </form>
    </div>}
  </>;
}
