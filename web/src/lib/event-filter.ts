import { toEventSelector, type Abi, type Log } from "viem";

/** Clone housekeeping and Pot transfers aren't membership events. Core events account for funds. */
export function selectAbiEventLogs<T extends Pick<Log, "topics">>(logs: readonly T[], abi: Abi): T[] {
  const selectors = new Set(abi.filter((entry) => entry.type === "event").map((event) => toEventSelector(event)));
  return logs.filter((log) => log.topics[0] !== undefined && selectors.has(log.topics[0]));
}
