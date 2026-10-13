"use client";

import { evidenceUrl } from "@/lib/evidence";
import { useState } from "react";

export function ReceiptPreview({ uri }: { uri: string }) {
  const url = evidenceUrl(uri);
  if (!url) return null;
  const host = url.hostname.replace("www.", "");
  const image = /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(url.pathname);
  const youtubeId =
    host === "youtu.be"
      ? url.pathname.slice(1)
      : host.includes("youtube.com")
        ? url.searchParams.get("v")
        : null;
  const loomId =
    host === "loom.com" || host.endsWith("loom.com")
      ? url.pathname.split("/").filter(Boolean).pop()
      : null;

  // Heavy embeds (image + iframes) get tucked behind a collapsed toggle so a
  // circle page with several Bonds doesn't render a wall of open media. The
  // compact link-style receipts below don't need it — they're already small.
  if (image)
    return (
      <Collapsible label="Image evidence" host={host} uri={uri}>
        <a
          href={uri}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-lg border border-line"
        >
          <img
            src={uri}
            alt="Receipt preview"
            className="max-h-64 w-full object-cover transition hover:scale-[1.02]"
          />
        </a>
      </Collapsible>
    );
  if (youtubeId)
    return (
      <Collapsible label="Video evidence" host={host} uri={uri}>
        <div className="overflow-hidden rounded-lg border border-line">
          <iframe
            className="aspect-video w-full"
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
            title="YouTube receipt"
            allowFullScreen
          />
        </div>
      </Collapsible>
    );
  if (loomId)
    return (
      <Collapsible label="Video evidence" host={host} uri={uri}>
        <div className="overflow-hidden rounded-lg border border-line">
          <iframe
            className="aspect-video w-full"
            src={`https://www.loom.com/embed/${loomId}`}
            title="Loom receipt"
            allowFullScreen
          />
        </div>
      </Collapsible>
    );

  // GitHub links are a natural "I shipped it" receipt for devs — parse the URL
  // into repo + what it points at so it reads as proof, not a bare link.
  const gh = host === "github.com" ? parseGitHub(url) : null;
  if (gh)
    return (
      <a
        href={uri}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-lg border border-line bg-bg px-3.5 py-3 transition hover:border-gold/40"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-5 w-5 shrink-0 fill-bone"
        >
          <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49l-.01-1.71c-2.78.62-3.37-1.37-3.37-1.37-.46-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.36-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.34 9.34 0 0 1 2.5-.34c.85 0 1.71.12 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9l-.01 2.81c0 .27.18.6.69.49A10.03 10.03 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-bone">{gh.title}</p>
          <p className="tnum truncate text-xs text-faint">{gh.repo}</p>
        </div>
        <span className="shrink-0 text-xs text-gold">Open ↗</span>
      </a>
    );

  return (
    <a
      href={uri}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-lg border border-line bg-bg px-3 py-2.5 text-xs text-muted transition hover:border-gold/40 hover:text-bone"
    >
      <span>View evidence · {host}</span>
      <span className="text-gold">Open ↗</span>
    </a>
  );
}

/// Compact header for heavy media receipts. Collapsed by default so multiple
/// Bonds don't each render a full embed; click to reveal, and a direct link is
/// always available so proof is reachable without expanding.
function Collapsible({
  label,
  host,
  uri,
  children,
}: {
  label: string;
  host: string;
  uri: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-line bg-bg">
      <div className="flex items-center justify-between px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-2 text-xs text-muted transition hover:text-bone"
        >
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className={`h-3.5 w-3.5 fill-current transition-transform ${open ? "rotate-90" : ""}`}
          >
            <path d="M7 5l6 5-6 5V5z" />
          </svg>
          <span>
            {label} · {host}
          </span>
        </button>
        <a
          href={uri}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-xs text-gold transition hover:brightness-110"
        >
          Open ↗
        </a>
      </div>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

/// Turns a github.com URL into { repo, title } describing what it points at —
/// a PR, commit, issue, release, branch, or the repo itself. Returns null if
/// the path isn't a recognizable owner/repo shape.
function parseGitHub(url: URL): { repo: string; title: string } | null {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const [owner, repo, kind, ref] = parts;
  const slug = `${owner}/${repo}`;
  if (kind === "pull" && ref)
    return { repo: slug, title: `Pull request #${ref}` };
  if (kind === "issues" && ref) return { repo: slug, title: `Issue #${ref}` };
  if (kind === "commit" && ref)
    return { repo: slug, title: `Commit ${ref.slice(0, 7)}` };
  if (kind === "releases" && ref)
    return { repo: slug, title: `Release ${parts[parts.length - 1]}` };
  if (kind === "tree" && ref)
    return { repo: slug, title: `Branch ${parts.slice(3).join("/")}` };
  return { repo: slug, title: repo };
}
