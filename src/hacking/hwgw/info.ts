import type { NS } from "@ns";
import { get_info } from "/hacking/hwgw/common";

export async function main(ns: NS): Promise<void> {
  if (ns.args.length!==2){return}

  const target = ns.args[0].toString()
  const delay = Number.parseFloat(ns.args[1].toString())

  const port = ns.getPortHandle(2)
  await ns.sleep(delay)

  port.tryWrite(get_info(ns, target))
}
