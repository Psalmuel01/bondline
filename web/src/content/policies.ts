import type { PublicPage } from "./product";
import { supportEmail, supportUrl, updatedDate } from "@/lib/site";
export const policyPages: Record<string, PublicPage> = {
  privacy: {
    eyebrow: "Privacy",
    title: "Know what is public, private, and stored.",
    description: `Privacy notice · Updated ${updatedDate}. This notice describes the current Bondline application, not a promise that blockchain activity or chat is anonymous.`,
    sections: [
      {
        title: "The application and contact",
        paragraphs: [
          "Bondline is maintained through the Bondline project repository. Its maintainers operate the website and social-service boundary. Use the contact page for the currently configured support channel. This notice does not claim a registered company, certification, or jurisdiction-specific compliance status.",
        ],
        links: [{ label: "Contact", href: "/contact" }],
      },
      {
        title: "Public on-chain data",
        paragraphs: [
          "Account addresses, Circle membership and invitations, commitments, stakes, deadlines, backing, evidence links, outcomes, and rewards are published on Monad. They can be read, copied, and indexed independently of Bondline. Blockchain records cannot be erased by deleting a profile or leaving this website.",
          "An address is not your legal identity, but other information may link it to you. Do not put sensitive personal information in commitment descriptions or evidence URLs.",
        ],
      },
      {
        title: "Profiles, images, and Circle identity",
        paragraphs: [
          "Display names, avatar choices, Circle missions, goals, and banners are stored in Supabase for display in the product. Uploaded avatar and banner images use a public storage bucket; knowing the URL can allow access outside the Circle. Use images intended for public display.",
          "These fields are optional. Circle metadata is shared group content and may be updated by other members. Removing your profile cannot remove another member’s on-chain activity or shared records.",
        ],
      },
      {
        title: "Circle conversation",
        paragraphs: [
          "Chat messages store the sender’s account, Circle address, message body, and time. The application checks signed-in identity and current Circle membership before reading or sending messages. This is access control, not end-to-end encryption: maintainers and database infrastructure can access stored messages.",
          "Members can copy messages they see. Do not use chat for private keys, recovery credentials, confidential medical or financial records, or information you would not share with your group.",
        ],
      },
      {
        title: "Cookies and browser storage",
        bullets: [
          "An HttpOnly sign-in cookie lasts up to seven days. A short-lived nonce cookie lasts up to five minutes. They establish identity for private app features.",
          "Browser storage retains a Mera credential identifier, onboarding state, notification preferences, notification read state, and encrypted journal vaults. Signing or journal encryption keys are not deliberately persisted there. Journal plaintext stays in memory while open; saved notes lock when the page is hidden. Unsaved notes remain open until saved or discarded.",
          "The private journal is stored only on the device and is not uploaded by Bondline. Export an encrypted backup before clearing storage. Import requires the same account, network, domain, and available passkey; Bondline cannot recover a lost encryption key. An unlocked page or compromised device can expose notes.",
          "Preference and notification state is stored per account and deployment network on the device; it is not synced between devices.",
          "Clearing browser storage does not delete a passkey from your password manager or erase on-chain history. Passkey recovery belongs to your provider.",
        ],
      },
      {
        title: "Infrastructure and retention",
        paragraphs: [
          "The application uses Vercel hosting, Supabase database/storage, Monad RPC infrastructure, and Envio event retrieval when configured. Requests may reveal ordinary connection data such as IP address, request metadata, and account addresses to infrastructure providers. Optional GitHub verification queries public GitHub data.",
          "On-chain data is persistent. Off-chain profiles and messages remain stored until removed through available controls or a processed support request. Infrastructure logs and backups can follow provider retention policies; immediate deletion from every backup is not promised. Uploaded public URLs may have been cached by others.",
          "The current build does not intentionally send behavioral data to a separate advertising analytics provider. Public activity metrics come from contracts and indexed events; they do not establish a count of unique real people.",
        ],
      },
      {
        title: "Your controls",
        paragraphs: [
          "Settings lets you edit your profile, choose local notification preferences, export your current profile and up to the latest 2,000 messages you authored, and reset local preferences. The export does not include other members’ messages, passkeys, signing material, or provider secrets. If the message limit is reached, the file states that it may be incomplete.",
          "For removal or access questions, contact the maintainers. Do not post private conversation content or secrets in a public issue. Where no private contact address is configured, ask for a private channel first. On-chain deletion and Bondline-operated passkey recovery are not available.",
        ],
        links: [
          { label: "Account settings", href: "/settings" },
          { label: "Security guide", href: "/docs/security" },
        ],
      },
    ],
  },
  terms: {
    eyebrow: "Terms",
    title: "Use Bondline with a clear understanding of the stakes.",
    description: `Product terms of use · Updated ${updatedDate}. These rules explain the current service and do not promise a financial return or an independently audited system.`,
    sections: [
      {
        title: "Using the application",
        paragraphs: [
          "By using Bondline, you agree to these product terms and acknowledge the privacy notice. Use it only if you are at least 18, can make your own financial decisions, and your use is lawful where you are. Do not use another person’s signing credentials without permission.",
          "Bondline is a commitment-accountability application maintained through its project repository. It is not a bank, deposit account, investment adviser, credit bureau, or insurance service. No registered-company, regulatory approval, or guaranteed availability claim is made here.",
        ],
      },
      {
        title: "Commitments and risk",
        paragraphs: [
          "You choose the goal, deadline, stake, Circle, and verification rule. Review them before confirming. After creation, cancellation and edits are not supported by the current contracts. A failed commitment can permanently transfer your stake to its Circle’s Pot.",
          "Cryptocurrency can fluctuate in value; transaction fees apply independently of the result. Testnet funds have no cash value. Smart-contract bugs, infrastructure outages, compromised devices, loss of passkeys, and verifier failures can cause loss or prevent access. The contracts are not independently audited.",
        ],
      },
      {
        title: "Settlement and verification",
        paragraphs: [
          "The deployed contracts determine escrow, eligibility, thresholds, deadlines, settlement, refund credits, and reward allocation. Website descriptions explain those rules; they do not create a discretionary refund entitlement or change contract execution.",
          "Circle review depends on eligible peers. External rules depend on the configured verifier and data source. Bondline does not guarantee a peer approval, a provider’s uptime, successful completion, reward income, or manual reversal of an outcome. The project administrator manages which external verifiers can be chosen for new commitments.",
        ],
      },
      {
        title: "Accounts and recovery",
        paragraphs: [
          "You are responsible for your passkey or external wallet and the evidence you submit. Bondline does not keep a custody key or provide an account reset that recovers funds. Creating a different passkey creates a different account. Never send credentials to support.",
        ],
      },
      {
        title: "Content and conduct",
        paragraphs: [
          "Share only content you may lawfully share. Do not publish confidential personal records, harmful material, impersonations, fraudulent evidence, or another person’s credentials. Do not coerce someone into staking, collude to misrepresent evidence, exploit security issues, or abuse the service.",
          "Private chat is membership-protected but readable by the service’s maintainers and database infrastructure. Public images and blockchain content may remain accessible beyond the app. Maintainers may restrict hosted features or remove off-chain content to address abuse or operational needs; they cannot erase blockchain records.",
        ],
      },
      {
        title: "Availability and changes",
        paragraphs: [
          "The application is provided with its published limitations. Features, hosting, documentation, and integrations may change or become unavailable. Access to on-chain contracts depends on the network and your signing access, even if the website is unavailable.",
          "These terms do not override rights that applicable law requires. There is no promise of compensation for a lost stake or a failed verification. Updated terms will be posted here with a revised date; material changes should be reviewed before further use.",
        ],
      },
      {
        title: "Questions",
        links: [
          { label: "Contact the maintainers", href: "/contact" },
          { label: "Privacy notice", href: "/privacy" },
          { label: "Security and deployed contracts", href: "/security" },
        ],
      },
    ],
  },
  contact: {
    eyebrow: "Contact",
    title: "A clear place for questions and feedback.",
    description:
      "Ask about the product, report a bug, or request a private reporting channel.",
    sections: [
      {
        title: "General support",
        paragraphs: [
          supportEmail
            ? `The configured public support address is ${supportEmail}. Include the screen, action, and error text so we can understand the problem.`
            : "General support currently uses the Bondline GitHub issue tracker. Include the screen, action, and error text. Check existing issues before opening another.",
        ],
        links: [
          {
            label: supportEmail ? "Contact support" : "Open the issue tracker",
            href: supportUrl,
          },
        ],
      },
      {
        title: "Security or privacy",
        paragraphs: [
          supportEmail
            ? "Use the configured support address to request private handling before sharing sensitive details. Never send signing keys or provider credentials."
            : "A dedicated private support address is not configured. Ask the maintainers for a private channel through the tracker without disclosing exploit details or private information. Do not publish a vulnerability or private conversation in an issue.",
        ],
        links: [
          { label: "Security model", href: "/security" },
          { label: "Privacy controls", href: "/privacy" },
        ],
      },
      {
        title: "Useful bug reports",
        bullets: [
          "Which page and what you were trying to do.",
          "The exact error message, browser, device, and time.",
          "The configured network and a public transaction link, if relevant.",
          "A screenshot only after removing private messages and sensitive details.",
          "Never a private key, passkey recovery credential, session cookie, or service secret.",
        ],
      },
    ],
  },
};
