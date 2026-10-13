import type { ChainActivityRow } from "./snapshots";
export function eventNotification(
  event: ChainActivityRow,
  ownedBondIds: ReadonlySet<string>,
) {
  const mine =
    event.bond_id !== null && ownedBondIds.has(String(event.bond_id));
  if (event.event_name === "CommitmentBacked" && mine)
    return {
      title: "Someone backed your commitment",
      body: "Your Circle recorded a little encouragement. Evidence is reviewed separately.",
      view: "commitments",
    };
  if (event.event_name === "BondResolved" && mine)
    return {
      title:
        Number(event.payload?.status) === 2
          ? "Your commitment completed"
          : "Your commitment settled as missed",
      body:
        Number(event.payload?.status) === 2
          ? "The stake was released or credited for withdrawal. Review the outcome in your Circle."
          : "The failed stake funded your Circle’s Pot.",
      view: "commitments",
      history: true,
    };
  if (event.event_name === "PotPeriodClosed")
    return {
      title: "A Circle reward week closed",
      body: "Open Pot & rewards to see the settled period and any share you earned.",
      view: "pot",
    };
  if (event.event_name === "PotRewardClaimed")
    return {
      title: "A Circle reward was received",
      body: "A recorded reward claim changed the Circle Pot.",
      view: "pot",
    };
  return null;
}
