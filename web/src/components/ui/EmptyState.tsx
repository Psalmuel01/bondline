export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-panel/40 px-6 py-10 text-center">
      <span
        aria-hidden="true"
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/10 text-2xl text-gold"
      >
        ◎
      </span>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
        {children}
      </div>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
