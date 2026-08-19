import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { getWalletSession } from "@/lib/server/session";
import { supabaseAdminRequest } from "@/lib/server/supabase-admin";
import type { ProfileRow } from "@/lib/supabase";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ address: string }> }) {
  try {
    const { address } = await context.params;
    const session = await getWalletSession();
    if (!session) return NextResponse.json({ error: "Wallet sign-in required." }, { status: 401 });
    if (!isAddress(address) || getAddress(address) !== session.address) {
      return NextResponse.json({ error: "You can only update your own profile." }, { status: 403 });
    }
    const input = (await request.json()) as { displayName?: string; avatarUrl?: string; avatarColor?: string };
    const displayName = input.displayName?.trim() ?? "";
    const avatarColor = input.avatarColor ?? "";
    if (!displayName || displayName.length > 32) return NextResponse.json({ error: "Display name must be between 1 and 32 characters." }, { status: 400 });
    if (!/^#[0-9a-fA-F]{6}$/.test(avatarColor)) return NextResponse.json({ error: "Invalid avatar color." }, { status: 400 });
    const rows = await supabaseAdminRequest<ProfileRow[]>("profiles", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ address: session.address.toLowerCase(), display_name: displayName, avatar_url: input.avatarUrl?.trim() || null, avatar_color: avatarColor, updated_at: new Date().toISOString() }),
    });
    return NextResponse.json(rows[0]);
  } catch {
    return NextResponse.json({ error: "Couldn’t update this profile." }, { status: 503 });
  }
}
