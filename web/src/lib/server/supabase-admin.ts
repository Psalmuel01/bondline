import "server-only";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mediaBucket = "circle-media";

// Exact HEAD counts avoid PostgREST's row limit without fetching event payloads.
export async function supabaseAdminCount(path: string): Promise<number> {
  if (!url || !serviceKey) throw new Error("The secure social layer is not configured.");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: "HEAD",
    cache: "no-store",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: "count=exact" },
  });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}).`);
  const total = response.headers.get("content-range")?.match(/\/(\d+)$/)?.[1];
  if (total === undefined || !Number.isSafeInteger(Number(total)))
    throw new Error("Supabase did not return an exact count.");
  return Number(total);
}

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

// PostgREST serializes PostgreSQL numeric columns as JSON numbers. Contract
// uint256 values routinely exceed Number.MAX_SAFE_INTEGER, so preserve the
// integer text at the server boundary and let the client convert it to bigint.
export async function supabaseAdminExactJson<T>(path: string, init?: RequestInit): Promise<T> {
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
  const text = await response.text();
  const exact = text.replace(
    /("(?:balance|bond_id|stake|payout_id|amount|indexedThroughBlock|last_finalized_block)"\s*:\s*)(-?\d+)(?=\s*[,}\]])/g,
    '$1"$2"',
  );
  return JSON.parse(exact) as T;
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
