export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://bondline-circle.vercel.app"
).replace(/\/$/, "");
export const githubUrl = "https://github.com/Psalmuel01/bondline";
export const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
export const supportUrl = supportEmail
  ? `mailto:${supportEmail}`
  : `${githubUrl}/issues`;
export const socialUrl = process.env.NEXT_PUBLIC_SOCIAL_URL;
export const updatedDate = "October 14, 2026";

function safeVideo(value?: string) {
  if (!value) return;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return;
  }
}
export const guidanceVideoUrl = safeVideo(
  process.env.NEXT_PUBLIC_GUIDANCE_VIDEO_URL,
);

export function pageMetadata(title: string, description: string, path: string) {
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}${path}` },
    openGraph: {
      title: `${title} · Bondline`,
      description,
      url: `${siteUrl}${path}`,
      siteName: "Bondline",
      type: "website" as const,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "Bondline — Put money behind the promises you make",
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: `${title} · Bondline`,
      description,
      images: ["/opengraph-image"],
    },
  };
}
