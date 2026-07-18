"use client";

import { useParams } from "next/navigation";
import { isAddress } from "viem";
import { PodDetail } from "@/components/PodDetail";

export default function PodPage() {
  const params = useParams<{ address: string }>();
  const raw = params?.address ?? "";

  if (!isAddress(raw)) {
    return (
      <div className="mx-auto w-full max-w-6xl px-5 py-10 text-sm text-gone sm:px-8">
        Invalid pod address.
      </div>
    );
  }

  return <PodDetail address={raw as `0x${string}`} />;
}
