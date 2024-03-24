import type { NS } from "@ns";
import { get_servers } from "/util/get_servers";

const script = "./share.js"

export async function main(ns: NS): Promise<void> {
  const servers = get_servers(ns)
    .filter(x=>ns.hasRootAccess(x))
    .filter(x=> ns.getServerMaxRam(x))

  const script_size = ns.getScriptRam(script)
  const subprocess :number[] = []
  ns.atExit(()=>{
    for (const pid of subprocess) {ns.kill(pid)}
  })
  
  for (const server of servers) {
    const ram = ns.getServerMaxRam(server) - ns.getServerUsedRam(server)
    const thread = Math.floor( ram / script_size)
    ns.scp(script, server)
    subprocess.push(ns.exec(script, server, thread))
  }
  while (true) {await ns.sleep(30000)}
}
