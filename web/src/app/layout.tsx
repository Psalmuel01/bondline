import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Body: Inter — geometric-humanist, warm, not a "crypto" font.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Display / wordmark: Space Grotesk — geometric grotesk with a humanist edge.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: "variable",
});

// Numbers: JetBrains Mono — stakes, countdowns, thresholds get their own
// ticker-like identity. The emotional core of the product is numeric.
const jetbrainsMono = JetBrains_Mono({
  preload: false,
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  alternates: { canonical: siteUrl },
  title: {
    default: "Bondline — Put money behind the promises you make",
    template: "%s · Bondline",
  },
  description:
    "Make commitments, support your friends, and follow through together. Chat, stake MON, and share evidence in your Circle.",
  icons: { icon: "/logo.svg", apple: "/logo.svg" },
  twitter: {
    card: "summary_large_image",
    title: "Bondline — Put money behind the promises you make",
    description:
      "Commitments, social accountability, verification, and shared incentives.",
    images: ["/opengraph-image"],
  },
  openGraph: {
    title: "Bondline — turn “I will” into “I did”",
    description:
      "Your people, your goals, and a little skin in the game. Make a promise, back each other, and follow through.",
    type: "website",
    siteName: "Bondline",
    url: siteUrl,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Bondline — Put money behind the promises you make",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="bondline-world" aria-hidden="true">
          <div className="world-plane" />
          <div className="world-beacon">
            <span />
          </div>
          <span className="world-spark world-spark-one" />
          <span className="world-spark world-spark-two" />
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
