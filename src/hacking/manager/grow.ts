import type { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
  if (ns.args.length !== 1) {return }
  const target = ns.args[0].toString()
  await ns.grow(target)
}
