import { Status, type Bond } from "./contracts";
export function reliability(bonds: Bond[]) {
  const completed = bonds.filter((b) => b.status === Status.Met).length;
  const failed = bonds.filter((b) => b.status === Status.Crossed).length;
  const settled = bonds.filter((b) => b.status === Status.Met || b.status === Status.Crossed).sort((a,b) => Number(b.deadline-a.deadline) || Number(b.id-a.id));
  let streak=0;
  for (const bond of settled) { if (bond.status!==Status.Met) break; streak++; }
  return { total:bonds.length, completed, failed, active:bonds.length-completed-failed, percentage:completed+failed>0?Math.round(completed/(completed+failed)*100):null, streak, totalStake:bonds.reduce((sum,b)=>sum+b.stake,0n) };
}
