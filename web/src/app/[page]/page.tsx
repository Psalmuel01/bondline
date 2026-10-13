import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { publicPages } from "@/content/product";
import { policyPages } from "@/content/policies";
import { ContentSections } from "@/components/site/ContentSections";
import { pageMetadata } from "@/lib/site";
const destinations: Record<string, string> = {
  product: "/#get-started",
  "how-it-works": "/#how-it-works",
  circles: "/#circles",
  verification: "/#verification",
  about: "/#circles",
};
const pages = { ...publicPages, ...policyPages };
export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(pages).map((page) => ({ page }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const doc = Object.hasOwn(pages, page) ? pages[page] : undefined;
  return doc ? pageMetadata(doc.eyebrow, doc.description, `/${page}`) : {};
}
export default async function PublicPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const doc = Object.hasOwn(pages, page) ? pages[page] : undefined;
  if (!doc) notFound();
  if (Object.hasOwn(destinations, page)) redirect(destinations[page]);
  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8">
      <Header />
      <main id="main-content" className="mx-auto max-w-3xl py-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">
          {doc.eyebrow}
        </p>
        <h1 className="font-display mt-5 text-4xl font-semibold leading-tight tracking-tight">
          {doc.title}
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted">{doc.description}</p>
        <div className="mt-12">
          <ContentSections sections={doc.sections} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
