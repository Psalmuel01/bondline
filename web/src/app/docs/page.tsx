import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { hasV2 } from "@/lib/contracts";
import { monadMainnet } from "@/lib/chain";
export const metadata = {
  title: "How Bondline works",
  description:
    "Make commitments, support friends, and follow through together.",
};
export default function DocsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
      <Header />
      <article className="mx-auto max-w-3xl space-y-10 py-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">
            How it works
          </p>
          <h1 className="font-display mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            A promise, with your people.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            Bondline brings your group’s conversation and commitments into one
            place. A little money on the line makes the goal tangible.
          </p>
        </div>
        <ol className="space-y-4">
          {[
            [
              "Find your Circle",
              "Create a Circle with at least one friend, or accept a member’s invitation. Your Circle’s chat is private to members.",
            ],
            [
              "Make a commitment",
              "Write a clear goal, choose a deadline, and put a stake in MON on the line. Review the details before confirming with your account.",
            ],
            [
              "Back each other",
              "Chat, share progress, and encourage a friend. ‘Back them’ records your support. It does not approve evidence or decide whether their stake returns.",
            ],
            [
              "Show you followed through",
              "For Circle-reviewed commitments, submit evidence before the deadline. Eligible members then have 24 hours to review it. ‘Approve evidence’ and ‘Dispute’ are recorded separately from earlier backing.",
            ],
          ].map(([title, body], i) => (
            <li
              key={title}
              className="flex gap-5 rounded-2xl border border-line bg-panel p-6"
            >
              <span className="tnum text-sm text-gold">0{i + 1}</span>
              <div>
                <h2 className="font-display text-lg font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <section className="rounded-2xl border border-gold/25 bg-gold/5 p-6">
          <h2 className="font-display text-xl font-semibold">
            Where does the money go?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Verified completion releases your stake back to you. Miss the
            deadline and your stake goes into the Circle’s shared Pot. Some
            outcomes require a settlement transaction after the review window
            closes.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {hasV2
              ? "After a deadline week ends and its commitments settle, completed commitments earn equal shares of that week’s reward pool. Members can claim their earned rewards from Pot & rewards. Weeks without completions roll forward; members cannot withdraw this reserved money by a vote."
              : "Members can propose and vote on spending from the Circle’s Pot."}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            If a direct stake refund cannot be delivered, find the returned
            stake in your profile and receive it from there.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold">
            Your account, without the wallet headache.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            A Mera passkey derives your signing account when you authenticate.
            Bondline does not store your private key. Use the same passkey to
            return to the same account. Your account menu shows your full
            address, available balance, and network.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Sign-in also establishes your private app session. Confirmations
            that change on-chain state still need your approval and a gas fee.
            You can also use a supported browser wallet.
          </p>
        </section>
        {hasV2 && (
          <section>
            <h2 className="font-display text-xl font-semibold">
              Other ways to verify
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              An account balance goal checks available MON after your stake is
              set aside; it does not measure long-term saving. When configured,
              GitHub verification checks an author’s public commits in a
              repository’s default branch. It does not prove ownership of that
              GitHub account.
            </p>
          </section>
        )}
        <p className="text-sm text-muted">
          {monadMainnet.testnet
            ? "This build runs on Monad testnet. Test MON has no cash value."
            : "This build runs on Monad mainnet and uses real MON."}
        </p>
        <Link className="primary-button" href="/">
          Find your Circle →
        </Link>
      </article>
      <Footer />
    </main>
  );
}
