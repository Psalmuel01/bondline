import { supabaseAdminCount, supabaseAdminRequest } from "@/lib/server/supabase-admin";
import { monadMainnet } from "@/lib/chain";
import { assertIndexDeployment } from "@/lib/server/index-deployment";
export const runtime = "nodejs";
export async function GET() {
  try {
    await assertIndexDeployment();
    const [aggregate, circleJoins] = await Promise.all([
      supabaseAdminRequest<Record<string, unknown>>("rpc/bondline_analytics", {
        method: "POST",
        body: JSON.stringify({ p_chain_id: monadMainnet.id }),
      }),
      supabaseAdminCount(`chain_events?select=event_name&chain_id=eq.${monadMainnet.id}&event_name=eq.CircleJoined`),
    ]);
    return Response.json({ ...aggregate, circleJoins });
  } catch {
    return Response.json(
      { error: "The event indexer is not configured for this deployment." },
      { status: 503 },
    );
  }
}
