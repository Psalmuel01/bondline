/** Establish a private app session using the already-open signing account. */
export async function authenticateWallet(
  address: `0x${string}`,
  sign: (message: string) => Promise<`0x${string}`>,
  onSession?: (session: { address: `0x${string}`; expiresAt?: number }) => void,
) {
  async function request<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const value = await response.json();
    if (!response.ok)
      throw new Error(
        value.error || "Could not finish signing in. Please try again.",
      );
    return value as T;
  }
  const { message } = await request<{ message: string }>(
    "/api/auth/challenge",
    { address },
  );
  const signature = await sign(message);
  const session = await request<{ address: `0x${string}`; expiresAt?: number }>(
    "/api/auth/verify",
    { address, message, signature },
  );
  if (session.address.toLowerCase() !== address.toLowerCase())
    throw new Error("The signed account does not match your session.");
  onSession?.(session);
  return session.address;
}
