import { Header } from "@/components/Header";
import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-6 sm:px-8">
      <Header />

      <section className="py-12 sm:py-16">
        <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Stake on your word.
          <br />
          <span className="text-muted">Let your crew hold the line.</span>
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
          Start a pod with your friends. Stake MON against your own deadlines. Hit
          them and your crew confirms the refund; miss them and the stake pools in
          the group vault. No nagging, no willpower — just money and a countdown.
        </p>
      </section>

      <Dashboard />

      <footer className="mt-16 border-t border-line pt-6 text-xs text-faint">
        Bondline · a group commitment protocol · every pod its own vault, isolated
        on-chain · built for the Spark hackathon on Monad
      </footer>
    </div>
  );
}
