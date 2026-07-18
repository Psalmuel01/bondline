// Tiny Supabase REST client. Keeping this dependency-free makes the optional
// social layer easy to turn on: set the two public values in .env.local.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

type ProfileRow = { address: string; display_name: string; updated_at: string };
export type ChatMessage = { id: string; circle_address: string; sender_address: string; body: string; created_at: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!url || !key) throw new Error("Supabase is not configured.");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error("Couldn’t reach the Circle social layer.");
  return response.json() as Promise<T>;
}

export async function getProfiles(addresses: readonly string[]) {
  if (!addresses.length || !isSupabaseConfigured) return [] as ProfileRow[];
  const list = addresses.map((address) => address.toLowerCase()).join(",");
  return request<ProfileRow[]>(`profiles?select=address,display_name,updated_at&address=in.(${list})`);
}

export async function saveProfile(address: string, displayName: string) {
  await request<ProfileRow[]>("profiles", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ address: address.toLowerCase(), display_name: displayName.trim() }),
  });
}

export async function getMessages(circleAddress: string) {
  return request<ChatMessage[]>(`circle_messages?select=*&circle_address=eq.${circleAddress.toLowerCase()}&order=created_at.desc&limit=50`);
}

export async function sendMessage(circleAddress: string, senderAddress: string, body: string) {
  await request<ChatMessage[]>("circle_messages", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ circle_address: circleAddress.toLowerCase(), sender_address: senderAddress.toLowerCase(), body: body.trim() }),
  });
}
