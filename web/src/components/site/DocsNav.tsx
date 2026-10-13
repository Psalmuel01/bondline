"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
export function DocsNav({
  items,
}: {
  items: { slug: string; title: string; group: string }[];
}) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const visible = items.filter((item) =>
    `${item.title} ${item.group}`.toLowerCase().includes(search.toLowerCase()),
  );
  const nav = (
    <>
      <label className="block">
        <span className="sr-only">Find a guide</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Find a guide…"
          className="product-field mb-6"
        />
      </label>
      <Link
        className={`mb-5 block text-sm ${pathname === "/docs" ? "text-gold" : "text-muted"}`}
        href="/docs"
        aria-current={pathname === "/docs" ? "page" : undefined}
      >
        Documentation home
      </Link>
      {[...new Set(visible.map((i) => i.group))].map((group) => (
        <div key={group} className="mb-6">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-faint">
            {group}
          </p>
          {visible
            .filter((i) => i.group === group)
            .map((item) => (
              <Link
                key={item.slug}
                href={`/docs/${item.slug}`}
                aria-current={
                  pathname === `/docs/${item.slug}` ? "page" : undefined
                }
                className={`block rounded-lg px-3 py-2 text-sm transition ${pathname === `/docs/${item.slug}` ? "bg-panel-hi text-bone" : "text-muted hover:text-bone"}`}
              >
                {item.title}
              </Link>
            ))}
        </div>
      ))}
      {!visible.length && (
        <p className="text-sm text-muted">No guide matches that search.</p>
      )}
    </>
  );
  return (
    <aside className="lg:sticky lg:top-6 lg:max-h-[85vh] lg:w-60 lg:shrink-0 lg:overflow-y-auto">
      <div className="hidden lg:block">{nav}</div>
      <details className="rounded-xl border border-line bg-panel p-4 lg:hidden">
        <summary className="cursor-pointer text-sm font-medium">
          Browse documentation
        </summary>
        <div className="pt-5">{nav}</div>
      </details>
    </aside>
  );
}
