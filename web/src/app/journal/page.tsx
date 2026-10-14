import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PrivateJournal } from "@/components/PrivateJournal";
export const metadata = {
  title: "Private journal",
  robots: { index: false, follow: false },
};
export default function JournalPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8">
      <Header />
      <main id="main-content" tabIndex={-1} className="py-10">
        <PrivateJournal />
      </main>
      <Footer />
    </div>
  );
}
