import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { supabaseAdminRequest } from "@/lib/server/supabase-admin";
import { monadMainnet } from "@/lib/chain";
import type { ChainActivityRow } from "@/lib/snapshots";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("circles") || "";
  const circles = [
    ...new Set(
      raw
        .split(",")
        .filter(Boolean)
        .map((address) => address.toLowerCase()),
    ),
  ];
  if (!circles.length) return NextResponse.json([]);
  if (circles.length > 50 || circles.some((address) => !isAddress(address)))
    return NextResponse.json(
      { error: "Choose valid Circles." },
      { status: 400 },
    );
  try {
    const rows = await supabaseAdminRequest<ChainActivityRow[]>(
      `chain_events?select=tx_hash,log_index,event_name,circle_address,actor_address,bond_id,payout_id,payload,block_timestamp&chain_id=eq.${monadMainnet.id}&circle_address=in.(${circles.join(",")})&order=block_number.desc,log_index.desc&limit=100`,
    );
    return NextResponse.json(rows, {
      headers: { "Cache-Control": "public, max-age=10" },
    });
  } catch {
    return NextResponse.json(
      { error: "Recent activity is temporarily unavailable." },
      { status: 503 },
    );
  }
}
