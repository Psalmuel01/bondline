import "server-only";
import { monadMainnet } from "@/lib/chain";
import { supabaseAdminExactJson } from "./supabase-admin";
export async function assertIndexDeployment() {
  const rows=await supabaseAdminExactJson<Array<{deployment_block:string;last_finalized_block:string}>>(`chain_sync_state?select=deployment_block,last_finalized_block&chain_id=eq.${monadMainnet.id}&limit=1`);
  if(!rows[0] || (process.env.BONDLINE_DEPLOYMENT_BLOCK && BigInt(rows[0].deployment_block)!==BigInt(process.env.BONDLINE_DEPLOYMENT_BLOCK)))throw new Error("The index is not ready for this deployment.");
  return rows[0];
}
