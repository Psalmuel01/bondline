"use client";

export function ReceiptPreview({ uri }: { uri: string }) {
  let url: URL;
  try { url = new URL(uri); } catch { return null; }
  const host = url.hostname.replace("www.", "");
  const image = /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(url.pathname);
  const youtubeId = host === "youtu.be" ? url.pathname.slice(1) : host.includes("youtube.com") ? url.searchParams.get("v") : null;
  const loomId = host === "loom.com" || host.endsWith("loom.com") ? url.pathname.split("/").filter(Boolean).pop() : null;
  if (image) return <a href={uri} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-line"><img src={uri} alt="Receipt preview" className="max-h-64 w-full object-cover transition hover:scale-[1.02]" /></a>;
  if (youtubeId) return <div className="overflow-hidden rounded-lg border border-line"><iframe className="aspect-video w-full" src={`https://www.youtube-nocookie.com/embed/${youtubeId}`} title="YouTube receipt" allowFullScreen /></div>;
  if (loomId) return <div className="overflow-hidden rounded-lg border border-line"><iframe className="aspect-video w-full" src={`https://www.loom.com/embed/${loomId}`} title="Loom receipt" allowFullScreen /></div>;
  const label = host.includes("github.com") ? "GitHub receipt" : "Open receipt";
  return <a href={uri} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-line bg-bg px-3 py-2.5 text-xs text-muted transition hover:border-gold/40 hover:text-bone"><span>{label} · {host}</span><span className="text-gold">Open ↗</span></a>;
}
