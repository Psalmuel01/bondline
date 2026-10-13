import { supabaseAdminRequest } from "@/lib/server/supabase-admin";
import { monadMainnet } from "@/lib/chain";
import { assertIndexDeployment } from "@/lib/server/index-deployment";
export const runtime = "nodejs";
export async function GET() {
  try {
    await assertIndexDeployment();
    return Response.json(
      await supabaseAdminRequest("rpc/bondline_analytics", {
        method: "POST",
        body: JSON.stringify({ p_chain_id: monadMainnet.id }),
      }),
    );
  } catch {
    return Response.json(
      { error: "The event indexer is not configured for this deployment." },
      { status: 503 },
    );
  }
}
