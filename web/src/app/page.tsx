import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Dashboard } from "@/components/Dashboard";
import { LandingExperience } from "@/components/LandingExperience";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-6 sm:px-8">
      <Header />

      <LandingExperience />

      <div id="circles" className="scroll-mt-6">
        <Dashboard />
      </div>

      <Footer />
    </div>
  );
}
