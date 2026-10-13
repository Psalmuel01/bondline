import { NextResponse } from "next/server";
import { createChallenge } from "@/lib/server/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { address } = (await request.json()) as { address?: string };
    if (!address)
      return NextResponse.json(
        { error: "Wallet address is required." },
        { status: 400 },
      );
    const message = await createChallenge(address, new URL(request.url).origin);
    return NextResponse.json({ message });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Couldn’t start sign-in.",
      },
      { status: 400 },
    );
  }
}
