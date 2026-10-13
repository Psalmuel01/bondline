import { notFound } from "next/navigation";
import Link from "next/link";
import { documentation } from "@/content/docs";
import { ContentSections, sectionId } from "@/components/site/ContentSections";
import { TesterPanel } from "@/components/TesterPanel";
import { pageMetadata, updatedDate } from "@/lib/site";
export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(documentation).map((slug) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = Object.hasOwn(documentation, slug)
    ? documentation[slug]
    : undefined;
  return doc ? pageMetadata(doc.title, doc.description, `/docs/${slug}`) : {};
}
export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = Object.hasOwn(documentation, slug)
    ? documentation[slug]
    : undefined;
  if (!doc) notFound();
  const all = Object.keys(documentation);
  const index = all.indexOf(slug);
  const next = all[index + 1];
  return (
    <article className="max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-widest text-gold">
        {doc.group}
      </p>
      <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        {doc.title}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        {doc.description}
      </p>
      <p className="mt-4 text-xs text-faint">Updated {updatedDate}</p>
      <details className="my-8 rounded-xl border border-line p-4">
        <summary className="cursor-pointer text-sm text-muted">
          On this page
        </summary>
        <nav aria-label="On this page" className="mt-4 flex flex-col gap-3">
          {doc.sections.map((s) => (
            <a
              key={s.title}
              href={`#${sectionId(s.title)}`}
              className="text-sm text-muted hover:text-gold"
            >
              {s.title}
            </a>
          ))}
        </nav>
      </details>
      <ContentSections sections={doc.sections} />
      {slug === "developers" && <TesterPanel />}
      {next && (
        <Link
          href={`/docs/${next}`}
          className="mt-10 block rounded-2xl border border-line p-5 text-sm text-gold"
        >
          Next: {documentation[next].title} →
        </Link>
      )}
    </article>
  );
}
