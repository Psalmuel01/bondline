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
  const ring =
    vote === "yes"
      ? "0 0 0 2px var(--done)"
      : vote === "no"
        ? "0 0 0 2px var(--gone)"
        : "0 0 0 1px var(--line)";

  return (
    <div
      className="tnum flex items-center justify-center rounded-full font-semibold transition-all duration-500"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `hsl(${hue} 45% 22%)`,
        color: `hsl(${hue} 70% 78%)`,
        boxShadow: ring,
      }}
      title={title ?? `${shortAddr(addr)}${you ? " (you)" : ""}`}
    >
      {addrInitials(addr)}
    </div>
  );
}
