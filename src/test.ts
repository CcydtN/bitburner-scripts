import type { NS } from "@ns";

// biome-ignore lint/nursery/useAwait: <explanation>
export  async function main(ns: NS): Promise<void> {
  ns.tail()
  ns.tprint("Hello Remote API!");
  ns.print(ns.ls('home'))
  ns.atExit(()=>ns.print("a"))
  ns.atExit(()=>ns.print("b"))
}
