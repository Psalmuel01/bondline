import {
  createSecretVaultWithExistingPasskey,
  decryptSecretVaultWithPasskey,
  parseSecretVault,
  type PasskeyCredentialMetadata,
  type PasskeySecretVault,
  type WebAuthnClient,
} from "@category-labs/mera";

export type JournalEntry = {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  body: string;
  commitment?: { id: string; core: string };
};
export type JournalDocument = { version: 1; entries: JournalEntry[] };
export type JournalEnvelope = {
  format: "bondline-private-journal";
  version: 1;
  owner: string;
  chainId: number;
  rpId: string;
  vault: PasskeySecretVault;
};
export const MAX_JOURNAL_BYTES = 2_000_000;
export function journalStorageKey(chainId: number, owner: string) {
  return `bondline.journal.v1.${chainId}.${owner.toLowerCase()}`;
}
export function parseJournalDocument(input: unknown): JournalDocument {
  if (!input || typeof input !== "object")
    throw new Error("This journal is not valid.");
  const doc = input as JournalDocument;
  if (
    doc.version !== 1 ||
    !Array.isArray(doc.entries) ||
    doc.entries.length > 100
  )
    throw new Error("This journal version or size is not supported.");
  const ids = new Set<string>();
  for (const entry of doc.entries) {
    if (
      !entry ||
      typeof entry.id !== "string" ||
      !/^[a-zA-Z0-9-]{1,64}$/.test(entry.id) ||
      ids.has(entry.id) ||
      typeof entry.title !== "string" ||
      entry.title.length > 120 ||
      typeof entry.body !== "string" ||
      entry.body.length > 8000 ||
      typeof entry.createdAt !== "string" ||
      !Number.isFinite(Date.parse(entry.createdAt)) ||
      typeof entry.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(entry.updatedAt))
    )
      throw new Error("A journal entry is invalid.");
    ids.add(entry.id);
    if (entry.commitment !== undefined) {
      const ref = entry.commitment;
      if (!ref || typeof ref.id !== "string" || !/^\d{1,78}$/.test(ref.id) ||
          BigInt(ref.id) >= 2n ** 256n || typeof ref.core !== "string" ||
          !/^0x[0-9a-fA-F]{40}$/.test(ref.core) || /^0x0{40}$/i.test(ref.core))
        throw new Error("A journal commitment reference is invalid.");
    }
  }
  return doc;
}
export function parseJournalEnvelope(
  raw: string,
  owner: string,
  chainId: number,
  rpId: string,
): JournalEnvelope {
  if (raw.length > MAX_JOURNAL_BYTES)
    throw new Error("This backup is too large.");
  const value = JSON.parse(raw) as JournalEnvelope;
  if (
    !value ||
    value.format !== "bondline-private-journal" ||
    value.version !== 1 ||
    value.owner?.toLowerCase() !== owner.toLowerCase() ||
    value.chainId !== chainId ||
    value.rpId !== rpId
  )
    throw new Error(
      "This backup belongs to a different account, network, or passkey domain.",
    );
  return { ...value, vault: parseSecretVault(value.vault) };
}
export async function encryptJournal(
  doc: JournalDocument,
  owner: string,
  chainId: number,
  rpId: string,
  credential: PasskeyCredentialMetadata,
  webAuthnClient?: WebAuthnClient,
): Promise<JournalEnvelope> {
  parseJournalDocument(doc);
  const bytes = new TextEncoder().encode(
    JSON.stringify({
      format: "bondline-journal-content-v1",
      owner: owner.toLowerCase(),
      chainId,
      rpId,
      document: doc,
    }),
  );
  try {
    const vault = await createSecretVaultWithExistingPasskey({
      rpId,
      credential,
      secret: bytes,
      ...(webAuthnClient ? { webAuthnClient } : {}),
    });
    if (vault.credential.credentialId !== credential.credentialId)
      throw new Error("Use the passkey for your signed-in account.");
    return {
      format: "bondline-private-journal",
      version: 1,
      owner: owner.toLowerCase(),
      chainId,
      rpId,
      vault,
    };
  } finally {
    bytes.fill(0);
  }
}
export async function decryptJournal(
  envelope: JournalEnvelope,
  credential: PasskeyCredentialMetadata,
  webAuthnClient?: WebAuthnClient,
): Promise<JournalDocument> {
  if (envelope.vault.credential.credentialId !== credential.credentialId)
    throw new Error("Use the passkey for your signed-in account.");
  const bytes = await decryptSecretVaultWithPasskey({
    vault: envelope.vault,
    rpId: envelope.rpId,
    ...(webAuthnClient ? { webAuthnClient } : {}),
  });
  try {
    const content = JSON.parse(new TextDecoder().decode(bytes));
    if (
      content.format !== "bondline-journal-content-v1" ||
      content.owner !== envelope.owner.toLowerCase() ||
      content.chainId !== envelope.chainId ||
      content.rpId !== envelope.rpId
    )
      throw new Error(
        "The encrypted journal context does not match its backup metadata.",
      );
    return parseJournalDocument(content.document);
  } finally {
    bytes.fill(0);
  }
}
