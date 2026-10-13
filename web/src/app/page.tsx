import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PublicLanding } from "@/components/site/PublicLanding";
import { HomeExperience } from "@/components/HomeExperience";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 py-6 sm:px-8">
      <Header />

      <main id="main-content" tabIndex={-1}>
        <HomeExperience landing={<PublicLanding />} />
      </main>

      <Footer />
    </div>
  );
}
