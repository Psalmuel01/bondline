import { walkthrough } from "@/content/product";
export function Walkthrough({
  headingLevel = "h3",
}: { headingLevel?: "h2" | "h3" } = {}) {
  const Heading = headingLevel;
  return (
    <ol className="relative space-y-0">
      {walkthrough.map((step, i) => (
        <li
          key={step.title}
          className="relative grid gap-4 border-l border-line pb-10 pl-8 last:pb-0 sm:grid-cols-[.9fr_1.1fr] sm:gap-8 sm:pl-10"
        >
          <span className="tnum absolute -left-3.5 top-0 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-bg text-xs text-gold">
            {i + 1}
          </span>
          <div>
            <Heading className="font-display text-xl font-semibold">
              {step.title}
            </Heading>
            <p className="mt-3 text-xs font-medium text-gold">{step.detail}</p>
          </div>
          <p className="max-w-lg text-sm leading-7 text-muted">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}
