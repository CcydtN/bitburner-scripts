import type { NS } from "@ns";
import { get_servers_available } from "./util/get_servers";
import { force_dispatch } from "./util/dispatcher";

// biome-ignore lint/nursery/useAwait: <explanation>
export async function main(ns: NS): Promise<void> {
  ns.tail()
  const servers = get_servers_available(ns);
  const exp = servers.map(name=> experience(ns,name))
  const max_exp = Math.max(...exp)
  const idx = exp.findIndex(val=>val===max_exp)
  while(true){
    force_dispatch(ns, './weaken.js', Number.POSITIVE_INFINITY)
    await ns.sleep(1)
  }
}

function experience(ns:NS, target:string){
  return (ns.getHackingLevel() - ns.getServerRequiredHackingLevel(target)) / ns.getHackingLevel()
}
