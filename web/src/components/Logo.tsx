/// The Bondline mark: a ring track (the Line), a gold progress arc (a Bond
/// running toward its deadline), a bone start marker, and a green cosign marker
/// sitting at the arc's tip. Same geometry as public/logo.svg, inline so it
/// scales crisply and can animate. Ships as a pure SVG — safe in server
/// components.
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 160 160"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Bondline"
    >
      <rect width="160" height="160" rx="28" fill="#14120F" />
      <g transform="translate(80,80)">
        <circle cx="0" cy="0" r="46" fill="none" stroke="#3A3733" strokeWidth="8" />
        <circle
          cx="0"
          cy="0"
          r="46"
          fill="none"
          stroke="#D9A441"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="188 289"
          transform="rotate(-90)"
        />
        <circle cx="0" cy="-46" r="5" fill="#F2EFE9" />
        <circle cx="-37.2" cy="27" r="6" fill="#3FA66C" />
      </g>
    </svg>
  );
}

/// Logo + wordmark lockup. The wordmark is set in the display face; the ring
/// carries the brand's circular language.
export function Wordmark({ size = 30 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <Logo size={size} />
      <span
        className="font-display font-semibold tracking-tight text-bone"
        style={{ fontSize: size * 0.62 }}
      >
        Bondline
      </span>
    </span>
  );
}
