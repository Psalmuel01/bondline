// Tiny Supabase REST client. Keeping this dependency-free makes the optional
// social layer easy to turn on: set the two public values in .env.local.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);
const CIRCLE_MEDIA_BUCKET = "circle-media";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export type ProfileRow = { address: string; display_name: string; avatar_url: string | null; avatar_color: string; updated_at: string };
export type ChatMessage = { id: string; circle_address: string; sender_address: string; body: string; created_at: string };
export type CircleMetadata = { circle_address: string; mission: string | null; pot_goal: string | null; banner_url: string | null; updated_at: string };
export type Activity = { id: string; circle_address: string; actor_address: string | null; kind: string; body: string; tx_hash: string | null; created_at: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!url || !key) throw new Error("Supabase is not configured.");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error("Couldn’t reach the Circle social layer.");
  return response.json() as Promise<T>;
}

/** Uploads a display image to the public Circle media bucket. */
export async function uploadCircleImage(file: File, objectPath: string) {
  if (!url || !key) throw new Error("Supabase is not configured.");
  if (!IMAGE_TYPES.has(file.type)) throw new Error("Choose a JPEG, PNG, WebP, or GIF image.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Images must be 5 MB or smaller.");

  const response = await fetch(`${url}/storage/v1/object/${CIRCLE_MEDIA_BUCKET}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": file.type,
      "x-upsert": "true",
    },
    body: file,
  });
  if (!response.ok) throw new Error("Couldn’t upload this image.");
  return `${url}/storage/v1/object/public/${CIRCLE_MEDIA_BUCKET}/${objectPath}`;
}

export async function getProfiles(addresses: readonly string[]) {
  if (!addresses.length || !isSupabaseConfigured) return [] as ProfileRow[];
  const list = addresses.map((address) => address.toLowerCase()).join(",");
  return request<ProfileRow[]>(`profiles?select=address,display_name,avatar_url,avatar_color,updated_at&address=in.(${list})`);
}

export async function saveProfile(address: string, profile: { displayName: string; avatarUrl?: string; avatarColor: string }) {
  await request<ProfileRow[]>("profiles", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ address: address.toLowerCase(), display_name: profile.displayName.trim(), avatar_url: profile.avatarUrl?.trim() || null, avatar_color: profile.avatarColor }),
  });
}

export async function getCircleMetadata(circleAddress: string) {
  const rows = await request<CircleMetadata[]>(`circle_metadata?select=*&circle_address=eq.${circleAddress.toLowerCase()}&limit=1`);
  return rows[0];
}

export async function saveCircleMetadata(circleAddress: string, metadata: { mission: string; potGoal: string; bannerUrl: string }) {
  await request<CircleMetadata[]>("circle_metadata", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ circle_address: circleAddress.toLowerCase(), mission: metadata.mission.trim() || null, pot_goal: metadata.potGoal ? Number(metadata.potGoal) : null, banner_url: metadata.bannerUrl.trim() || null }) });
}

export async function getActivity(circleAddress: string) {
  return request<Activity[]>(`circle_activity?select=*&circle_address=eq.${circleAddress.toLowerCase()}&order=created_at.desc&limit=50`);
}

export async function recordActivity(activity: { circleAddress: string; actorAddress?: string; kind: string; body: string; txHash: string }) {
  if (!isSupabaseConfigured) return;
  await request<Activity[]>("circle_activity", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ circle_address: activity.circleAddress.toLowerCase(), actor_address: activity.actorAddress?.toLowerCase() || null, kind: activity.kind, body: activity.body, tx_hash: activity.txHash }) });
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
