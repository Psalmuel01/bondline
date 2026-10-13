import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { EmptyState } from "@/components/ui/EmptyState";
export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8">
      <Header />
      <main id="main-content" className="mx-auto max-w-2xl py-16">
        <EmptyState
          title="This page isn’t here"
          action={
            <Link className="primary-button" href="/">
              Return to Bondline →
            </Link>
          }
        >
          The link may have changed, or the Circle address may be incomplete.
          Check the invitation or visit your dashboard.
        </EmptyState>
      </main>
      <Footer />
    </div>
  );
}
