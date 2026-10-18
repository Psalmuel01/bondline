import {workerAuthorized} from '@/lib/server/verification';
import {supabaseAdminRequest} from '@/lib/server/supabase-admin';
import {CORE_ADDRESS} from '@/lib/contracts';
export const runtime='nodejs';
const filter=`chain_id=eq.10143&core_address=eq.${CORE_ADDRESS.toLowerCase()}`;
export async function GET(request:Request) {
 if(!workerAuthorized(request))return Response.json({error:'Unauthorized.'},{status:401});
 try {
  const rows=await supabaseAdminRequest<{ciphertext:string}[]>(`verification_runtime_sessions?${filter}&select=ciphertext&limit=1`);
  return Response.json(rows[0] ?? {},{status:rows.length?200:404,headers:{'Cache-Control':'no-store'}});
 } catch {return Response.json({error:'Runtime session storage unavailable.'},{status:503});}
}
export async function POST(request:Request) {
 if(!workerAuthorized(request))return Response.json({error:'Unauthorized.'},{status:401});
 try {
  const raw=await request.text();
  if(raw.length>32768)return Response.json({error:'Session too large.'},{status:413});
  const input=JSON.parse(raw);
  if(typeof input.ciphertext!=='string' || input.ciphertext.length>24576)return Response.json({error:'Invalid session.'},{status:400});
  const value=JSON.parse(input.ciphertext);
  if(value.version!==1 || !/^[a-f0-9]{24}$/.test(value.iv) || !/^[a-f0-9]{32}$/.test(value.tag) || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.data))return Response.json({error:'Invalid session.'},{status:400});
  await supabaseAdminRequest('verification_runtime_sessions?on_conflict=chain_id,core_address',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({chain_id:10143,core_address:CORE_ADDRESS.toLowerCase(),ciphertext:input.ciphertext,updated_at:new Date().toISOString()})});
  return Response.json({saved:true});
 } catch {return Response.json({error:'Could not persist runtime session.'},{status:503});}
}
