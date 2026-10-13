import { faq } from "@/content/product";
export function FAQ({ compact = false }: { compact?: boolean }) {
  return (
    <section id="faq" className="scroll-mt-8">
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">
          Questions, answered
        </p>
        <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight">
          Know the rules before you start.
        </h2>
      </div>
      <div className="divide-y divide-line border-y border-line">
        {(compact
          ? faq.filter((_, index) => [0, 1, 3, 5, 8].includes(index))
          : faq
        ).map((item) => (
          <details key={item.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-5 text-sm font-medium sm:text-base">
              {item.q}
              <span
                aria-hidden="true"
                className="text-gold group-open:rotate-45"
              >
                ＋
              </span>
            </summary>
            <p className="mt-4 max-w-3xl pr-6 text-sm leading-7 text-muted">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
