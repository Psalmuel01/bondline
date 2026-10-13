import { NextResponse } from "next/server";
import { clearWalletSession, getWalletSession } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getWalletSession();
  return NextResponse.json(
    session ? { address: session.address, expiresAt: session.expiresAt } : null,
  );
}

export async function DELETE() {
  await clearWalletSession();
  return new NextResponse(null, { status: 204 });
}
