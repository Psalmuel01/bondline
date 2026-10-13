/** Evidence is linked in the browser, never fetched by this helper. */
export function evidenceUrl(value: string): URL | undefined {
  if (!value || value.length > 2048) return;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return;
    return url;
  } catch {
    return;
  }
}
