import { productConfigured, verificationClient, workerAvailable } from '@/lib/server/verification';
import { CORE_ADDRESS, coreAbi } from '@/lib/contracts';
export const runtime='nodejs';
export async function GET() {
  let external=false;
  if(productConfigured()) try {
    const verifier=process.env.NEXT_PUBLIC_EXTERNAL_VERIFIER_ADDRESS as `0x${string}`;
    const [trusted,balance,price,online]=await Promise.all([verificationClient.readContract({address:CORE_ADDRESS,abi:coreAbi,functionName:'isTrustedVerifier',args:[verifier]}),verificationClient.getBalance({address:verifier}),verificationClient.getGasPrice(),workerAvailable()]);
    external=trusted && online && balance>=price*250000n;
  } catch { /* Fail closed if authorization cannot be checked. */ }
  return Response.json({external,mode:external?'cli-simulation':null,methods:['manual','balance',...(external?['github','onchain']:[])]},{headers:{'Cache-Control':'no-store'}});
}
