import 'server-only';

export function workerWakeConfigured() {
 try {
  const url=new URL(process.env.BONDLINE_VERIFICATION_WAKE_URL ?? '');
  return process.env.BONDLINE_VERIFICATION_EXECUTION==='on-demand' && url.protocol==='https:' && url.pathname==='/wake' && !url.username && !url.password && !url.search;
 } catch {return false;}
}
export async function wakeVerificationWorker() {
 if(!workerWakeConfigured())return;
 try {
  const response=await fetch(process.env.BONDLINE_VERIFICATION_WAKE_URL!,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${process.env.BONDLINE_VERIFICATION_WORKER_SECRET}`},cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok)console.warn('Verification startup request was not accepted; queued work is retained.');
 } catch {console.warn('Verification service is starting or unavailable; queued work is retained.');}
}
