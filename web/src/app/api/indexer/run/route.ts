import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runIndexerBatch } from "@/lib/server/indexer";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!supplied) return false;
  const actual = Buffer.from(supplied);
  return [process.env.BONDLINE_INDEXER_SECRET, process.env.CRON_SECRET].some((secret) => {
    if (!secret || secret.length < 32) return false;
    const expected = Buffer.from(secret);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  });
}

async function run(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return NextResponse.json(await runIndexerBatch());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Indexer batch failed." },
      { status: 503 },
    );
  }
}

export const GET = run;
export const POST = run;
