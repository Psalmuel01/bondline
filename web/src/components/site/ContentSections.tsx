import Link from "next/link";
import type { ContentSection } from "@/content/docs";
export function sectionId(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
export function ContentSections({ sections }: { sections: ContentSection[] }) {
  return (
    <div className="space-y-10">
      {sections.map((section) => (
        <section
          key={section.title}
          id={sectionId(section.title)}
          className="scroll-mt-8"
        >
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {section.title}
          </h2>
          {section.paragraphs?.map((p) => (
            <p
              key={p}
              className="mt-4 text-sm leading-7 text-muted sm:text-base"
            >
              {p}
            </p>
          ))}
          {section.bullets && (
            <ul className="mt-4 space-y-3 pl-5 text-sm leading-7 text-muted marker:text-gold">
              {section.bullets.map((item) => (
                <li className="list-disc" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          )}
          {section.code && (
            <pre className="mt-5 overflow-x-auto rounded-2xl border border-line bg-bg p-5 text-xs leading-6 text-bone">
              <code>{section.code}</code>
            </pre>
          )}
          {section.links && (
            <div className="mt-5 flex flex-wrap gap-4">
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-gold hover:underline"
                >
                  {link.label} ↗
                </Link>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
