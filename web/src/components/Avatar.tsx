"use client";

import { addrHue, addrInitials, shortAddr } from "@/lib/format";

type Vote = "yes" | "no" | "pending";

/// A member's identity chip. In the voting UI its ring lights green/red the
/// instant that member's VoteCast event lands; elsewhere it's a neutral face.
export function Avatar({
  addr,
  size = 40,
  vote = "pending",
  you = false,
  title,
}: {
  addr: `0x${string}`;
  size?: number;
  vote?: Vote;
  you?: boolean;
  title?: string;
}) {
  const hue = addrHue(addr);
  const cosigned = vote === "yes" || vote === "no";
  const ring =
    vote === "yes"
      ? "0 0 0 2px var(--confirm), 0 0 12px rgba(63,166,108,0.45)"
      : vote === "no"
        ? "0 0 0 2px var(--forfeit), 0 0 12px rgba(193,80,63,0.4)"
        : you
          ? "0 0 0 1.5px var(--gold)"
          : "0 0 0 1px var(--line)";

  return (
    <div
      className={`tnum flex items-center justify-center rounded-full font-semibold transition-all duration-500 ${
        cosigned ? "cosign-in" : ""
      }`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: cosigned
          ? undefined
          : `hsl(${hue} 30% 20%)`,
        backgroundColor: cosigned
          ? `hsl(${hue} 22% 16%)`
          : undefined,
        color: `hsl(${hue} 55% 74%)`,
        boxShadow: ring,
      }}
      title={title ?? `${shortAddr(addr)}${you ? " (you)" : ""}`}
    >
      {addrInitials(addr)}
    </div>
  );
}
