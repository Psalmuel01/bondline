import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductAnalytics } from "@/components/ProductAnalytics";
import { pageMetadata } from "@/lib/site";
export const metadata = pageMetadata(
  "Network activity",
  "Public commitment activity and outcome metrics from contracts and indexed events.",
  "/analytics",
);
export default function Analytics() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-6 sm:px-8">
      <Header />
      <main id="main-content" tabIndex={-1}>
        <ProductAnalytics />
      </main>
      <Footer />
    </div>
  );
}
