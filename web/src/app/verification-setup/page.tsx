import { Header } from '@/components/Header';
import { VerifierSetup } from '@/components/VerifierSetup';
export const metadata={title:'Verifier setup',robots:{index:false,follow:false}};
export default function Page(){return <div className="mx-auto max-w-3xl px-5 py-6"><Header/><main id="main-content" className="py-10"><VerifierSetup/></main></div>;}
