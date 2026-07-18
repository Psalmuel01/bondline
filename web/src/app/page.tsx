import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-6 sm:px-8">
      <Header />

      <section className="py-14 sm:py-20">
        <span className="tnum inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-[11px] tracking-wide text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-gold pulse" />
          MONEY ON THE LINE · YOUR CREW DECIDES
        </span>
        <h1 className="font-display mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Ship together,
          <br />
          <span className="text-gold">or fund together.</span>
        </h1>
        <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">
          Missing your own deadline costs exactly zero. So we made it cost
          something. Start a Circle with your friends, stake MON against your own
          deadline, and let your crew cosign whether you actually shipped. Beat
          the Line and you&apos;re refunded. Cross it and your stake drops into
          the shared Pot — the money your misses hand back to the group.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="#circles"
            className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-108"
          >
            Start a Circle
          </a>
          <Link
            href="/docs"
            className="rounded-lg border border-line px-5 py-2.5 text-sm font-medium text-bone transition hover:border-panel-hi"
          >
            How it works
          </Link>
        </div>
      </section>

      <div id="circles" className="scroll-mt-6">
        <Dashboard />
      </div>

      <Footer />
    </div>
  );
}
