import { notFound } from "next/navigation";
import { isAddress } from "viem";
import { CircleDetail } from "@/components/CircleDetail";
export const metadata = {
  title: "Circle workspace",
  robots: { index: false, follow: false },
};
export default async function CirclePage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  if (!isAddress(address)) notFound();
  return <CircleDetail address={address as `0x${string}`} />;
}
