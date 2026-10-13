"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "./ConnectButton";
import { Wordmark } from "./Logo";
import { NotificationCenter } from "./NotificationCenter";
import { Modal } from "./ui/Modal";
const publicLinks = [
  ["/#how-it-works", "How it works"],
  ["/docs", "Docs"],
  ["/security", "Security"],
];
const appLinks = [
  ["/", "Home"],
  ["/app/commitments", "Commitments"],
  ["/app/circles", "Circles"],
  ["/app/activity", "Activity"],
  ["/profile", "Profile"],
];
export function Header() {
  const { isConnected } = useAccount();
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const inApp =
    isConnected &&
    (pathname === "/" ||
      pathname.startsWith("/app/") ||
      pathname.startsWith("/circle/") ||
      pathname === "/profile" ||
      pathname === "/settings");
  const links = inApp ? appLinks : publicLinks;
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-gold focus:p-4 focus:text-ink"
      >
        Skip to content
      </a>
      <header className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-b border-line/70 pb-4">
        <Link href="/" aria-label="Bondline home" className="shrink-0">
          <Wordmark size={29} />
        </Link>
        <nav
          aria-label={inApp ? "Application" : "Website"}
          className={`${inApp ? "order-3 flex w-full overflow-x-auto lg:order-none lg:w-auto" : "hidden md:flex"} items-center gap-0.5`}
        >
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className="workspace-tab"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {isConnected ? (
            <NotificationCenter />
          ) : (
            <div className="hidden sm:block">
              <ConnectButton
                label="Sign in"
                intent="signin"
                appearance="quiet"
              />
            </div>
          )}
          <ConnectButton />
          {!inApp && (
            <button
              onClick={() => setMenu(true)}
              className="icon-button md:hidden"
              aria-label="Open navigation"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5 fill-none stroke-current stroke-2"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          )}
        </div>
      </header>
      <Modal
        open={menu}
        onClose={() => setMenu(false)}
        title="Explore Bondline"
      >
        <nav aria-label="Mobile website" className="flex flex-col gap-1 p-5">
          {[...publicLinks, ["/contact", "Contact"]].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenu(false)}
              aria-current={pathname === href ? "page" : undefined}
              className="workspace-tab justify-start"
            >
              {label}
            </Link>
          ))}
        </nav>
        {!isConnected && (
          <div className="border-t border-line p-5">
            <p className="mb-3 text-sm text-muted">
              Ready to make a commitment?
            </p>
            <Link
              href="/#get-started"
              onClick={() => setMenu(false)}
              className="primary-button w-full"
            >
              Get started →
            </Link>
          </div>
        )}
      </Modal>
    </>
  );
}
