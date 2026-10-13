import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { documentation } from "@/content/docs";
import { ContentSections } from "@/components/site/ContentSections";
import { CORE_ADDRESS, CIRCLE_FACTORY_ADDRESS } from "@/lib/contracts";
import { monadMainnet, explorerAddr } from "@/lib/chain";
import { pageMetadata } from "@/lib/site";
export const metadata = pageMetadata(
  "Security",
  "Published contract rules, deployment details, passkey security, and explicit trust boundaries.",
  "/security",
);
export default function Security() {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8">
      <Header />
      <main id="main-content" className="mx-auto max-w-3xl py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">
          Trust & security
        </p>
        <h1 className="font-display mt-5 text-4xl font-semibold tracking-tight">
          Rules you can inspect.
          <br />
          Risks you should understand.
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted">
          Trust comes from showing where funds go, who can verify an outcome,
          and what this product cannot guarantee.
        </p>
        <section className="my-8 rounded-2xl border border-gold/25 bg-gold/5 p-6">
          <h2 className="font-display text-lg font-semibold">
            Current application deployment
          </h2>
          <p className="mt-3 text-sm text-muted">
            {monadMainnet.name} · chain {monadMainnet.id} · contracts not
            independently audited.
          </p>
          {monadMainnet.testnet && (
            <p className="mt-3 text-sm text-muted">
              Test MON has no cash value. This is not a v2 mainnet deployment.
            </p>
          )}
          <dl className="mt-5 space-y-4">
            {[
              ["Escrow core", CORE_ADDRESS],
              ["Circle factory", CIRCLE_FACTORY_ADDRESS],
            ].map(([name, address]) => (
              <div key={name}>
                <dt className="text-xs text-muted">{name}</dt>
                <dd>
                  <a
                    href={explorerAddr(address)}
                    target="_blank"
                    rel="noreferrer"
                    className="tnum mt-2 block break-all text-xs text-gold"
                  >
                    {address} ↗
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <ContentSections sections={documentation.security.sections} />
        <div className="mt-10 flex flex-wrap gap-3">
          <Link className="secondary-button" href="/docs/contracts">
            Contract reference →
          </Link>
          <Link className="secondary-button" href="/privacy">
            Privacy notice →
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
