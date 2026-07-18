"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import type { Circle } from "@/lib/contracts";
import { shortAddr } from "@/lib/format";
import { getMessages, isSupabaseConfigured, sendMessage, type ChatMessage } from "@/lib/supabase";

export function CircleChat({ circle, names }: { circle: Circle; names: Record<string, string> }) {
  const { address } = useAccount();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const isMember = !!address && circle.members.some((member) => member.toLowerCase() === address.toLowerCase());

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    const load = () => getMessages(circle.address).then((rows) => { if (!cancelled) setMessages(rows); }).catch(() => { if (!cancelled) setError("Chat is temporarily unavailable."); });
    load();
    const timer = window.setInterval(load, 5_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [circle.address]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!address || !body.trim()) return;
    setSending(true); setError("");
    try { await sendMessage(circle.address, address, body); setBody(""); setMessages(await getMessages(circle.address)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn’t send message."); }
    finally { setSending(false); }
  }

  return <section className="flex min-h-[360px] flex-col rounded-xl border border-line bg-panel">
    <div className="flex items-center justify-between border-b border-line px-4 py-3"><div><p className="font-display text-sm font-semibold text-bone">Circle chat</p><p className="text-[11px] text-faint">Keep the Line honest.</p></div><span className="tnum rounded-full border border-line px-2 py-0.5 text-[10px] text-faint">{circle.members.length} members</span></div>
    {!isSupabaseConfigured ? <div className="m-4 rounded-lg border border-dashed border-line p-4 text-xs leading-relaxed text-faint">Add Supabase env values to turn this into your Circle&apos;s group chat.</div> : <>
      <div className="flex flex-1 flex-col-reverse gap-3 overflow-y-auto p-4">{messages.length === 0 ? <p className="m-auto text-center text-xs text-faint">No messages yet. Set the tone.</p> : messages.map((message) => <div key={message.id} className="flex gap-2"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-panel-hi text-[10px] text-gold">{(names[message.sender_address] || shortAddr(message.sender_address)).slice(0, 1).toUpperCase()}</div><div><p className="text-xs font-medium text-bone">{names[message.sender_address] || shortAddr(message.sender_address)} <span className="ml-1 font-normal text-faint">{new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span></p><p className="mt-0.5 text-sm leading-relaxed text-muted">{message.body}</p></div></div>)}</div>
      {isMember ? <form onSubmit={submit} className="border-t border-line p-3"><div className="flex gap-2"><input maxLength={500} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Reply to the Circle…" className="min-w-0 flex-1 rounded-md border border-line bg-bg px-3 py-2 text-sm text-bone outline-none focus:border-gold/50" /><button disabled={sending || !body.trim()} className="rounded-md bg-gold px-3 text-sm font-semibold text-ink disabled:opacity-40">{sending ? "…" : "Send"}</button></div>{error && <p className="mt-2 text-xs text-forfeit">{error}</p>}</form> : <p className="border-t border-line px-4 py-3 text-xs text-faint">Only Circle members can join the chat.</p>}</>}
  </section>;
}
