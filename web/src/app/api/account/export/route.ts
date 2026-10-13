import { NextResponse } from "next/server";
import { getWalletSession } from "@/lib/server/session";
import { supabaseAdminRequest } from "@/lib/server/supabase-admin";
import type { ChatMessage, ProfileRow } from "@/lib/supabase";
export const runtime = "nodejs";
export async function GET() {
  try {
    const session = await getWalletSession();
    if (!session)
      return NextResponse.json(
        { error: "Sign in to export your information." },
        { status: 401 },
      );
    const address = session.address.toLowerCase();
    const profiles = await supabaseAdminRequest<ProfileRow[]>(
      `profiles?select=*&address=eq.${address}&limit=1`,
    );
    const messages: ChatMessage[] = [];
    for (let offset = 0; offset < 2000; offset += 500) {
      const rows = await supabaseAdminRequest<ChatMessage[]>(
        `circle_messages?select=*&sender_address=eq.${address}&order=created_at.desc,id.desc&limit=500&offset=${offset}`,
      );
      messages.push(...rows);
      if (rows.length < 500) break;
    }
    return NextResponse.json(
      {
        exportedAt: new Date().toISOString(),
        address,
        profile: profiles[0] || null,
        authoredMessages: messages,
        messageLimit: 2000,
        mayBeIncomplete: messages.length >= 2000,
        notice:
          "This export excludes other members’ messages, passkeys, signing material, and infrastructure logs. Public blockchain records remain accessible on the explorer.",
      },
      {
        headers: {
          "Content-Disposition":
            'attachment; filename="bondline-account-export.json"',
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Your export could not be prepared. Please try again." },
      { status: 503 },
    );
  }
}
