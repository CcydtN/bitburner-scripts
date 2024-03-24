import type { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
  if (ns.args.length!==2){return}

  const target = ns.args[0].toString()
  const delay = Number.parseFloat(ns.args[1].toString())

  await ns.weaken(target,{additionalMsec: delay})
}
