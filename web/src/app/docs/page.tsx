import Link from "next/link";
import { documentation } from "@/content/docs";
import { pageMetadata } from "@/lib/site";
export const metadata = pageMetadata(
  "Documentation",
  "Guides for making commitments, running Circles, understanding settlement, and building with Bondline.",
  "/docs",
);
export default function DocsIndex() {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-widest text-gold">
        Bondline documentation
      </p>
      <h1 className="font-display mt-4 text-4xl font-semibold tracking-tight">
        Know what you’re committing to.
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
        Practical guides for your first promise, your Circle, and the rules
        behind every outcome. Technical references explain how the application
        actually works.
      </p>
      <div className="my-8 flex flex-wrap gap-3">
        <Link className="primary-button" href="/docs/getting-started">
          Start here →
        </Link>
        <Link className="secondary-button" href="/guide">
          Guided walkthrough
        </Link>
      </div>
      {["Using Bondline", "Trust", "Developers"].map((group) => (
        <section key={group} className="mt-10">
          <h2 className="font-display text-xl font-semibold">{group}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(documentation)
              .filter(([, doc]) => doc.group === group)
              .map(([slug, doc]) => (
                <Link
                  key={slug}
                  href={`/docs/${slug}`}
                  className="motion-card rounded-2xl border border-line bg-panel p-5 hover:border-gold/40"
                >
                  <h3 className="text-sm font-semibold">{doc.title} ↗</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {doc.description}
                  </p>
                </Link>
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
