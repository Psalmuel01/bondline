import { formatEther } from "viem";

export function shortAddr(addr?: string) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/// Deterministic hue [0,360) from an address, for member avatars. Same address
/// always gets the same color across the app, so a face is recognizable.
export function addrHue(addr: string): number {
  let h = 0;
  const s = addr.toLowerCase();
  for (let i = 2; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

/// Two-char initials from an address (the two hex chars after 0x), upper-cased.
export function addrInitials(addr: string): string {
  return addr.slice(2, 4).toUpperCase();
}

export function bpsPct(bps: number): string {
  return `${Math.round((bps / 10000) * 100)}%`;
}

export function formatMon(wei: bigint) {
  const s = formatEther(wei);
  // trim trailing zeros but keep it readable
  const n = Number(s);
  if (n === 0) return "0";
  if (n < 0.001) return n.toExponential(2);
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

/// Returns { text, expired } for a deadline given as a unix-seconds bigint.
export function countdownParts(deadlineSec: bigint, nowMs: number) {
  const deadlineMs = Number(deadlineSec) * 1000;
  const diff = deadlineMs - nowMs;
  if (diff <= 0) return { expired: true, text: "00:00:00" };

  const total = Math.floor(diff / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  const pad = (x: number) => x.toString().padStart(2, "0");
  const text = d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
  return { expired: false, text, urgent: diff < 60_000 };
}
