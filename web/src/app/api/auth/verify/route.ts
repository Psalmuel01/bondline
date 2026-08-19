import { NextResponse } from "next/server";
import { verifyChallenge } from "@/lib/server/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { address, message, signature } = (await request.json()) as { address?: string; message?: string; signature?: `0x${string}` };
    if (!address || !message || !signature) return NextResponse.json({ error: "Incomplete sign-in response." }, { status: 400 });
    const session = await verifyChallenge(address, message, signature);
    return NextResponse.json({ address: session.address, expiresAt: session.expiresAt });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn’t verify signature." }, { status: 401 });
  }
}
