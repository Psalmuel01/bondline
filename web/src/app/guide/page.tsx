import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { OnboardingGuide } from "@/components/OnboardingGuide";
import { Walkthrough } from "@/components/site/Walkthrough";
import { pageMetadata, guidanceVideoUrl } from "@/lib/site";
export const metadata = pageMetadata(
  "Product walkthrough",
  "A guided introduction to accounts, Circles, stakes, backing, evidence, settlement, and your record of follow-through.",
  "/guide",
);
export default function Guide() {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8">
      <Header />
      <main id="main-content" className="mx-auto max-w-4xl space-y-10 py-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">
            The product guide
          </p>
          <h1 className="font-display mt-5 text-4xl font-semibold tracking-tight">
            Your first promise, step by step.
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted">
            Learn what you’re committing to before you put anything on the line.
          </p>
          <div className="mt-7">
            <OnboardingGuide />
          </div>
        </div>
        <Walkthrough headingLevel="h2" />
        <section className="rounded-2xl border border-line bg-panel p-6">
          <h2 className="font-display text-xl font-semibold">
            The first few minutes
          </h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-muted">
            <li>
              Create an account or return with the same passkey. Open the
              account menu to copy the address and check its network.
            </li>
            <li>
              Fund it on the configured network if needed, leaving room for a
              stake and fees.
            </li>
            <li>
              Create a Circle with at least one friend, or accept an invitation
              from Members in an existing Circle.
            </li>
            <li>
              Choose a small goal and review the exact deadline, stake, and
              verification method.
            </li>
            <li>
              Check in through chat, back a friend, and submit evidence in time.
            </li>
            <li>
              Review the outcome and explore Pot & rewards and your profile.
            </li>
          </ol>
        </section>
        <div className="flex flex-wrap gap-3">
          <Link href="/docs/getting-started" className="primary-button">
            Detailed getting-started guide →
          </Link>
          <a
            href="/walkthrough-script.md"
            className="secondary-button"
            download
          >
            Download walkthrough script
          </a>
        </div>
        {guidanceVideoUrl ? (
          <a href={guidanceVideoUrl} className="primary-button">
            Watch the product walkthrough ↗
          </a>
        ) : (
          <p className="text-xs leading-6 text-muted">
            A recorded product walkthrough is not published yet. The
            downloadable 3-minute script includes the shot list and exact states
            required; there is no placeholder video pretending to play.
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}
