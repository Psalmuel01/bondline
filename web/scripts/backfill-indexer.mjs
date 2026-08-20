const baseUrl = process.env.BONDLINE_APP_URL?.replace(/\/$/, "");
const secret = process.env.BONDLINE_INDEXER_SECRET;

if (!baseUrl || !secret) {
  console.error("Set BONDLINE_APP_URL and BONDLINE_INDEXER_SECRET before running the backfill.");
  process.exit(1);
}

let batches = 0;
while (true) {
  const response = await fetch(`${baseUrl}/api/indexer/run`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const result = await response.json();
  if (!response.ok) {
    console.error(result.error ?? `Indexer request failed (${response.status}).`);
    process.exit(1);
  }
  batches += 1;
  console.log(
    `Batch ${batches}: blocks ${result.fromBlock}-${result.throughBlock}, ${result.events} events, ${result.circles} Circles, ${result.bonds} Bonds, ${result.payouts} payouts.`,
  );
  if (result.caughtUp) {
    console.log(`Backfill complete through finalized block ${result.throughBlock}.`);
    break;
  }
}
