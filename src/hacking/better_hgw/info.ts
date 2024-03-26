import type { NS } from "@ns";
import { Message, compute_strategy } from "/hacking/better_hgw/common";
import { create_msg } from "/util/event_system";

export async function main(ns: NS): Promise<void> {
  if (ns.args.length!==2){return}

  const target = ns.args[0].toString()
  const delay = Number.parseFloat(ns.args[1].toString())

  const port = ns.getPortHandle(1)
  await ns.sleep(delay)

  const msg = create_msg(Message.update_target_info, compute_strategy(ns, target))
  port.tryWrite(msg)
}
