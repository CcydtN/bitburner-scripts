import type { NS } from "@ns";

// biome-ignore lint/nursery/useAwait: <explanation>
export async function main(ns: NS): Promise<void> {
  ns.tail()
  ns.print(ns.hacknet.numNodes())
  // ns.alterReality();
}
