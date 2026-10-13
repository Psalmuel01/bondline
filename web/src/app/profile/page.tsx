import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ReliabilityProfile } from "@/components/ReliabilityProfile";
export const metadata = {
  title: "Your profile",
  robots: { index: false, follow: false },
};
export default function Profile() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-6 sm:px-8">
      <Header />
      <main id="main-content" tabIndex={-1}>
        <ReliabilityProfile />
      </main>
      <Footer />
    </div>
  );
}
