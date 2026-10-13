import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SettingsExperience } from "@/components/SettingsExperience";
export const metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};
export default function Settings() {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8">
      <Header />
      <main id="main-content" className="py-10">
        <h1 className="font-display mb-8 text-3xl font-semibold tracking-tight">
          Your settings
        </h1>
        <SettingsExperience />
      </main>
      <Footer />
    </div>
  );
}
