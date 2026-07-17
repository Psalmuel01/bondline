import { ConnectButton } from "@/components/ConnectButton";
import { Feed } from "@/components/Feed";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-6 sm:px-8">
      {/* header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-live/40 bg-live/10 text-live">
            <span className="text-sm font-bold">§</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Shipstake
          </span>
          <span className="tnum ml-1 rounded border border-line px-1.5 py-0.5 text-[10px] text-faint">
            MONAD TESTNET
          </span>
        </div>
        <ConnectButton />
      </header>

      {/* hero */}
      <section className="py-12 sm:py-16">
        <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Put money behind your word.
          <br />
          <span className="text-muted">Let the chain enforce your deadline.</span>
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
          Escrow MON behind a promise and name a witness. Ship in time and they refund you. Miss the
          deadline and anyone can move your stake to a beneficiary you&apos;d rather not fund. No
          nagging, no willpower — just a countdown that resolves itself.
        </p>
      </section>

      <Feed />

      <footer className="mt-16 border-t border-line pt-6 text-xs text-faint">
        A stake-backed commitment protocol · one vault contract, one screen of trust surface ·
        built for the Spark hackathon on Monad
      </footer>
    </div>
  );
}
