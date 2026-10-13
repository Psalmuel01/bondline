import { useCases } from "@/content/product";
export function UseCases() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {useCases.map((item) => (
        <article
          key={item.title}
          className="rounded-2xl border border-line bg-panel p-6"
        >
          <p className="text-xs font-semibold text-gold">{item.title}</p>
          <h3 className="font-display mt-4 text-lg font-medium leading-relaxed">
            “{item.goal}”
          </h3>
          <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-muted">
            {item.proof}
          </p>
          <p className="mt-4 text-[10px] text-faint">
            Illustrative goal—not a reported customer outcome.
          </p>
        </article>
      ))}
    </div>
  );
}
