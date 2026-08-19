import "server-only";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mediaBucket = "circle-media";

export async function supabaseAdminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!url || !serviceKey) throw new Error("The secure social layer is not configured.");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}).`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function uploadMediaObject(path: string, file: File) {
  if (!url || !serviceKey) throw new Error("The secure social layer is not configured.");
  const response = await fetch(`${url}/storage/v1/object/${mediaBucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": file.type,
      "x-upsert": "true",
    },
    body: file,
  });
  if (!response.ok) throw new Error(`Media upload failed (${response.status}).`);
  return `${url}/storage/v1/object/public/${mediaBucket}/${path}`;
}

export async function deleteMediaObject(path: string) {
  if (!url || !serviceKey) throw new Error("The secure social layer is not configured.");
  const response = await fetch(`${url}/storage/v1/object/${mediaBucket}/${path}`, {
    method: "DELETE",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!response.ok && response.status !== 404) throw new Error(`Media deletion failed (${response.status}).`);
}

export function publicMediaPath(mediaUrl: string) {
  if (!url) return;
  const prefix = `${url}/storage/v1/object/public/${mediaBucket}/`;
  return mediaUrl.startsWith(prefix) ? decodeURIComponent(mediaUrl.slice(prefix.length)) : undefined;
}
