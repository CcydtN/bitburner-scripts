import type { NS } from "@ns";
import { get_servers_available } from "/util/get_servers";
import { force_dispatch } from "/util/dispatcher";

// biome-ignore lint/nursery/useAwait: <explanation>
export async function main(ns: NS): Promise<void> {
  ns.tail()
  const script = "./weaken.js";
  while(true) {
    const servers = get_servers_available(ns);
    const exp = servers.map(name=> experience(ns,name))
    const max_exp = Math.max(...exp)
    const idx = exp.findIndex(val=>val===max_exp)
    const target = servers[idx]

    for(const host of servers){
      const ram = ns.getServerMaxRam(host) - ns.getServerUsedRam(host)
      const usage = ns.getScriptRam(script)
      const thread = Math.floor(ram/usage)
      if (thread === 0) {continue}
      ns.exec(script, host, thread, target)
    }
    await ns.sleep(1)
  }
}

function experience(ns:NS, target:string){
  return (ns.getHackingLevel() - ns.getServerRequiredHackingLevel(target)) / ns.getHackingLevel()
}
