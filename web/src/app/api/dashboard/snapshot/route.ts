import { NextResponse } from "next/server";
import { supabaseAdminExactJson } from "@/lib/server/supabase-admin";

import { assertIndexDeployment } from "@/lib/server/index-deployment";

export const runtime = "nodejs";

export async function GET() {
  try {
    const sync = await assertIndexDeployment();
    const [circles, bonds, payouts] = await Promise.all([
      supabaseAdminExactJson<unknown[]>("indexed_circles?select=*&order=created_block.asc"),
      supabaseAdminExactJson<unknown[]>("indexed_bonds?select=*&order=bond_id.asc"),
      supabaseAdminExactJson<unknown[]>("indexed_payouts?select=*&order=payout_id.asc"),

    ]);
    return NextResponse.json(
      { circles, bonds, payouts, indexedThroughBlock: sync.last_finalized_block },
      { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" } },
    );
  } catch {
    return NextResponse.json({ error: "The dashboard snapshot is temporarily unavailable." }, { status: 503 });
  }
}
