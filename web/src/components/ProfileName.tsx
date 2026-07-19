"use client";

import { useState } from "react";
import { deleteCircleImage, uploadCircleImage, type ProfileRow } from "@/lib/supabase";
import { shortAddr } from "@/lib/format";

const COLORS = ["#514332", "#3d4f6a", "#4d3b5f", "#265344", "#6a3f31"];

export function ProfileName({ address, profile, editable = false, onSave }: { address: `0x${string}`; profile?: ProfileRow; editable?: boolean; onSave?: (profile: { displayName: string; avatarUrl?: string; avatarColor: string }) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(profile?.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [color, setColor] = useState(profile?.avatar_color ?? COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const label = profile?.display_name || shortAddr(address);

  function openEditor() {
    if (!editable) return;
    setName(profile?.display_name ?? "");
    setAvatarUrl(profile?.avatar_url ?? "");
    setColor(profile?.avatar_color ?? COLORS[0]);
    setError("");
    setOpen(true);
  }

  return <>
    <button onClick={openEditor} className={editable ? "group flex items-center gap-1.5 text-left hover:text-gold" : "flex items-center gap-1 text-left"} title={editable ? "Edit profile" : shortAddr(address)}>
      {label}{editable && <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line text-faint transition group-hover:border-gold/50 group-hover:text-gold" aria-label="Edit profile"><svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 fill-none stroke-current stroke-2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg></span>}
    </button>
    {open && <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/65 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="Edit profile">
      <form onSubmit={async (event) => { event.preventDefault(); if (!onSave || !name.trim() || uploading) return; setSaving(true); setError(""); try { const previousUrl = profile?.avatar_url ?? ""; await onSave({ displayName: name, avatarUrl, avatarColor: color }); if (previousUrl && previousUrl !== avatarUrl) await deleteCircleImage(previousUrl); setOpen(false); } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn’t save your profile."); } finally { setSaving(false); } }} className="w-full max-w-xl rounded-2xl border border-panel-hi bg-panel p-6 shadow-2xl shadow-black/30 sm:p-7">
        <div className="flex items-start justify-between"><div><p className="tnum text-[10px] uppercase tracking-widest text-gold">Your Bondline profile</p><h2 className="font-display mt-1 text-xl font-semibold text-bone">Make your address human.</h2></div><button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-bone">×</button></div>
        <div className="mt-6 flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full text-lg font-semibold text-bone" style={{ background: color }}>{avatarUrl ? <img src={avatarUrl} alt="" onError={() => { setAvatarUrl(""); setError("This photo is no longer available. Save your profile to clear it."); }} className="h-full w-full object-cover" /> : name.slice(0, 1).toUpperCase()}</div><div><p className="text-sm text-bone">{name || "Your name"}</p><p className="tnum text-xs text-faint">{shortAddr(address)}</p></div></div>
        <label className="mt-5 flex flex-col gap-1.5"><span className="text-xs uppercase tracking-widest text-faint">Display name</span><input autoFocus maxLength={32} value={name} onChange={(event) => setName(event.target.value)} placeholder="Sam" className="rounded-md border border-line bg-bg px-3 py-2.5 text-sm text-bone outline-none focus:border-gold/50" /></label>
        <label className="mt-4 flex flex-col gap-1.5"><span className="text-xs uppercase tracking-widest text-faint">Profile photo <span className="normal-case tracking-normal">(optional, 5 MB max)</span></span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; setUploading(true); setError(""); try { const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg"; setAvatarUrl(await uploadCircleImage(file, `avatars/${address.toLowerCase()}/${Date.now()}.${extension}`)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn’t upload this image."); } finally { setUploading(false); } }} className="block w-full cursor-pointer rounded-md border border-line bg-bg px-3 py-2 text-xs text-muted file:mr-3 file:rounded file:border-0 file:bg-panel-hi file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-bone hover:file:bg-line" /></label>{avatarUrl && <button type="button" onClick={() => setAvatarUrl("")} className="mt-2 rounded-md border border-forfeit/30 px-2.5 py-1.5 text-xs text-forfeit transition hover:bg-forfeit/10">Remove current photo</button>}
        <div className="mt-4"><span className="text-xs uppercase tracking-widest text-faint">Avatar color</span><div className="mt-2 flex gap-2">{COLORS.map((candidate) => <button type="button" key={candidate} onClick={() => setColor(candidate)} className={`h-7 w-7 rounded-full border-2 ${color === candidate ? "border-gold" : "border-transparent"}`} style={{ background: candidate }} />)}</div></div>
        {error && <p className="mt-3 text-xs text-forfeit">{error}</p>}<button disabled={saving || uploading || !name.trim()} className="mt-6 w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-40">{uploading ? "Uploading image…" : saving ? "Saving…" : "Save profile"}</button>
      </form>
    </div>}
  </>;
}
