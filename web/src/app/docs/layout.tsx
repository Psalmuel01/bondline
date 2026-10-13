import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DocsNav } from "@/components/site/DocsNav";
import { documentation } from "@/content/docs";
export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8">
      <Header />
      <div className="flex flex-col gap-8 py-10 lg:flex-row lg:gap-12">
        <DocsNav
          items={Object.entries(documentation).map(
            ([slug, { title, group }]) => ({ slug, title, group }),
          )}
        />
        <main id="main-content" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
