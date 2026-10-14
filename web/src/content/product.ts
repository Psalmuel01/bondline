import type { ContentSection } from "./docs";
export const walkthrough = [
  {
    title: "Make a commitment",
    body: "Define the goal, deadline, and evidence your Circle can judge. Choose a verification method before you begin.",
    detail: "A clear outcome, not a vague intention.",
  },
  {
    title: "Put something behind it",
    body: "Choose a stake in MON that matters to you. Review the full commitment before confirming.",
    detail: "Your amount. Your decision. A real consequence.",
  },
  {
    title: "Get backed",
    body: "Circle members can encourage you by backing the goal. Support remains separate from evidence approval.",
    detail: "Belief first. A fair review afterward.",
  },
  {
    title: "Prove it",
    body: "Submit evidence before the deadline, or satisfy the selected on-chain or external rule.",
    detail: "Completion follows the rule chosen at creation.",
  },
  {
    title: "Settle the outcome",
    body: "Success releases your stake. Failure funds the Circle’s Pot, where reserved funds reward completed commitments.",
    detail: "Transparent rules for both outcomes.",
  },
  {
    title: "Build your record",
    body: "Completed and missed commitments become your history of follow-through. Active goals do not affect completion rate.",
    detail: "Progress you can understand—not a credit score.",
  },
];
export const useCases = [
  {
    title: "Builders",
    goal: "Publish the release and link the changelog by Friday.",
    proof:
      "A release URL and working demo reviewed by your Circle; configured GitHub verification can measure commit activity.",
  },
  {
    title: "Fitness",
    goal: "Complete three training sessions before Sunday.",
    proof:
      "Share session logs for Circle review. No wearable provider is currently connected.",
  },
  {
    title: "Study",
    goal: "Finish the course exercises and share a worked solution.",
    proof:
      "Evidence reviewed by study partners. Automated course-platform verification is not available.",
  },
  {
    title: "Teams",
    goal: "Deliver the agreed milestone and document the handoff.",
    proof:
      "A clear acceptance condition and review by eligible peers. Member backing does not replace delivery approval.",
  },
  {
    title: "Friends",
    goal: "Finish the first chapter and discuss it at our next meetup.",
    proof:
      "Share a reading summary. Agree on a reasonable evidence rule before staking.",
  },
  {
    title: "Balance goals",
    goal: "Reach the MON balance target I choose before the deadline.",
    proof:
      "An on-chain check of available MON after staking. This does not lock savings or measure long-term saving.",
  },
];
export const faq = [
  {
    q: "What happens if I fail?",
    a: "After failure settles, your stake goes to your Circle’s Pot. A commitment that simply reaches its deadline may still need a settlement action. You cannot cancel it afterward to recover the stake.",
  },
  {
    q: "Where does my money go?",
    a: "Your commitment stake is escrowed in the core contract. Verified success releases it to you; failure transfers it to your Circle. In v2, failed stakes are reserved for weekly rewards based on completed commitments.",
  },
  {
    q: "Can Bondline take my funds?",
    a: "The website does not hold a custodial balance or choose arbitrary outcomes. Contract rules control escrow and settlement. Smart-contract bugs, compromised devices, and trusted external verifiers are real risks; the contracts are not independently audited.",
  },
  {
    q: "Can I cancel or edit a commitment?",
    a: "You can leave the form before confirming. Once created on-chain, cancellation, deadline changes, and stake edits are not supported.",
  },
  {
    q: "Who verifies completion?",
    a: "Eligible Circle members review submitted evidence, or the selected verification rule applies. On-chain MON balance checks are supported. GitHub verification requires an authorized, operating worker. Fitness, learning, and CRE integrations are not live.",
  },
  {
    q: "Why back someone and then review evidence?",
    a: "Backing says you believe they can follow through. Reviewing evidence decides whether they did. Backing never counts toward the evidence approval threshold, and a backer can later dispute inadequate evidence.",
  },
  {
    q: "Do cosigners lose money?",
    a: "Backing and evidence review do not escrow the supporter’s money. They are on-chain actions, so the person submitting one pays its transaction fee.",
  },
  {
    q: "Is this a gambling product?",
    a: "Bondline is designed around commitments about your own actions and agreed evidence, not games of chance or betting on market outcomes. Stakes can be forfeited. That product design is not a guarantee of any particular legal classification.",
  },
  {
    q: "What is a Circle and its Pot?",
    a: "A Circle is your group, with a private conversation, member list, commitment history, and separate Pot contract. Failed stakes fund its Pot. Once a deadline week closes and all its commitments settle, each completed commitment earns an equal share of that week’s available reward pool.",
  },
  {
    q: "Do I need crypto or a browser wallet?",
    a: "You need MON on the configured network for stakes and fees. Mera passkeys create a signing account without a seed phrase or browser extension. An existing compatible browser wallet is optional.",
  },
  {
    q: "What if verification fails or stops working?",
    a: "A failed balance check can be retried before the deadline if you reach the target. External verification must be operated reliably and submit success in time. Provider errors do not automatically prove failure, but expiry rules still apply. There is no guaranteed operator override.",
  },
  {
    q: "Are chat and journals encrypted?",
    a: "Circle chat is protected by sign-in and membership checks, but it is not end-to-end encrypted. Project operators can access stored messages. The private journal uses a separate Mera PRF-derived encryption key and stores ciphertext on your device. Export encrypted backups; losing the passkey or unbacked local data can make notes unrecoverable. Profiles, images, commitment descriptions, and evidence links should be treated as public.",
  },
  {
    q: "What network does Bondline use?",
    a: "The documented v2 deployment uses Monad testnet, chain ID 10143. Test MON has no cash value. The account menu and Security page show the configured deployment; never fund an address on the wrong network.",
  },
  {
    q: "What happens if I lose my passkey?",
    a: "Bondline cannot reset or recover your signing key. Passkey recovery depends on your provider. Use the same credential and stable domain to return to the same account; creating another credential creates another account.",
  },
];
export type PublicPage = {
  title: string;
  eyebrow: string;
  description: string;
  sections: ContentSection[];
};
export const publicPages: Record<string, PublicPage> = {
  product: {
    title: "Put money behind the promises you make.",
    eyebrow: "The product",
    description:
      "Commitments, social accountability, verification, and shared incentives—in one place for the people who want to follow through.",
    sections: [
      {
        title: "A consequence that you choose",
        paragraphs: [
          "A reminder can tell you what you meant to do. Bondline gives that intention a deadline, a stake, and a group that can see the outcome. You choose the goal and amount before committing; you can lose the stake if you do not complete it.",
        ],
      },
      {
        title: "Your people, inside the product",
        paragraphs: [
          "Circles bring the conversation and commitments together. Friends can back a goal, ask how it is going, and review evidence once it is submitted. Supporting a person and approving an outcome remain distinct actions.",
        ],
      },
      {
        title: "A rule before a result",
        paragraphs: [
          "Select Circle review or an available automatic method when creating a commitment. Independent balance checks reduce reliance on self-reporting for a narrow, measurable rule. Human review supports broader goals but depends on peers’ judgment.",
        ],
      },
      {
        title: "A history that stays useful",
        paragraphs: [
          "Your profile records settled outcomes, completion rate, streak, total committed, and unique supporters. It is a record of this account’s commitments, not a credit score or identity verification.",
        ],
        links: [
          { label: "Explore the reliability guide", href: "/docs/reliability" },
        ],
      },
    ],
  },
  "how-it-works": {
    title: "A clear path from promise to proof.",
    eyebrow: "How it works",
    description:
      "Agree on the outcome. Choose a consequence. Follow through with your Circle.",
    sections: [
      {
        title: "Know both outcomes before you start",
        paragraphs: [
          "Verified success releases your stake. Failure funds your Circle’s Pot. The exact deadline and selected rule appear on the review screen before you sign. There is no cancellation after a commitment is created.",
        ],
        links: [{ label: "First commitment guide", href: "/docs/commitments" }],
      },
    ],
  },
  circles: {
    title: "Give your group a reason to show up.",
    eyebrow: "Circles",
    description:
      "A private conversation, shared commitments, and a Pot that rewards follow-through. Your group’s progress, with a structure everyone can understand.",
    sections: [
      {
        title: "Start with a shared purpose",
        paragraphs: [
          "Create a Circle for your team, training partners, study group, or friends. Add initial members and choose the evidence approval threshold. Later, a member can invite an account and the invitee can accept from the Circle link.",
        ],
      },
      {
        title: "Support is social. Approval is deliberate.",
        paragraphs: [
          "Backing a goal records encouragement. Evidence approval is a separate response after completion is claimed. Reviewers for an existing commitment do not change when the Circle grows.",
        ],
      },
      {
        title: "The Pot belongs to the Circle’s rules",
        paragraphs: [
          "Failed stakes fund your Circle rather than another group. In v2 they are reserved for weekly reward pools: each completed commitment earns an equal share once the week ends and all its outcomes settle. Members with more completions earn more shares; weeks without completions roll funds forward.",
        ],
      },
      {
        title: "See the group’s progress",
        paragraphs: [
          "Members can follow current goals, evidence reviews, public outcomes, and finalized activity. Circle progress summaries use recorded commitments. The conversation remains accessible only to authenticated members.",
        ],
        links: [
          { label: "Understand Circle membership", href: "/docs/circles" },
          { label: "Reward accounting", href: "/docs/settlement" },
        ],
      },
    ],
  },
  verification: {
    title: "Accountability is stronger with evidence.",
    eyebrow: "Verification",
    description:
      "Choose a completion rule you understand. Human judgment where it is useful; independently checked signals where they are supported.",
    sections: [
      {
        title: "Circle evidence review · available",
        paragraphs: [
          "Submit evidence before your deadline. Eligible peers can approve or dispute it during a 24-hour window. This supports many real-world goals, but it relies on the judgment and integrity of the group.",
        ],
      },
      {
        title: "On-chain MON balance · available",
        paragraphs: [
          "Reach a target available balance and trigger a check before your deadline. The target and account are fixed by the commitment. This checks a balance; it does not prove long-term saving, income, or financial health.",
        ],
      },
      {
        title: "GitHub contributions · configuration required",
        paragraphs: [
          "The repository includes a trusted worker for public commits by an author on a repository’s default branch. It needs authorization, funding, and a recurring process. The creation form offers it only when the deployment has a verifier address. It does not prove ownership of the author’s GitHub account.",
        ],
      },
      {
        title: "Where we can go next · planned",
        paragraphs: [
          "Fitness providers, learning platforms, custom external providers, and CRE orchestration are future integration work. None is presented as live in this build. A device-local, passkey-encrypted private journal is available separately from public evidence and Circle chat.",
        ],
        links: [
          {
            label: "Verification limits and failure modes",
            href: "/docs/verification",
          },
        ],
      },
    ],
  },
  about: {
    title: "Follow-through deserves a better home.",
    eyebrow: "Why Bondline",
    description:
      "Most goals live between a note you forget and a group chat that moves on. Bondline makes the promise, the consequence, and the outcome visible in one place.",
    sections: [
      {
        title: "Agency before pressure",
        paragraphs: [
          "A useful commitment starts with a goal you choose and a stake you are comfortable losing. Bondline is designed for voluntary accountability, not coercion, punishment, or guaranteed productivity.",
        ],
      },
      {
        title: "People before a score",
        paragraphs: [
          "The Circle is the social context: peers understand the goal, encouragement helps along the way, and evidence gives them a basis for review. A history of completion is useful context, not a judgment of a person’s worth.",
        ],
      },
      {
        title: "Precision earns trust",
        paragraphs: [
          "We explain where funds go, what verification actually proves, and what the application does not support. We do not invent customers, reviews, financial returns, audits, or institutional backing.",
        ],
        links: [
          { label: "Security and trust model", href: "/security" },
          {
            label: "Read the source",
            href: "https://github.com/Psalmuel01/bondline",
          },
        ],
      },
    ],
  },
};
