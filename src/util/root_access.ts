import type { NS } from "@ns";
import { get_servers } from "./util/get_servers";

function gain_root(ns:NS, target:string):boolean{
  let table: Map<string, (host:string)=>void> = new Map([
    ["BruteSSH.exe", ns.brutessh],
    ["FTPCrack.exe", ns.ftpcrack],
    ["HTTPWorm.exe", ns.httpworm],
    ["SQLInject.exe", ns.sqlinject],
    ["relaySMTP.exe", ns.relaysmtp],
  ])

  table = new Map([...table.entries()].filter((val)=> ns.fileExists(val[0])))
  const requirement = ns.getServerNumPortsRequired(target)
  if ( table.size < requirement ){ return false }
  for (const f of table.values()) { f(target) }
  ns.nuke(target)
  return true
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("scan")
  const done = new Set()
  const pending = new Set(get_servers(ns))

  while (pending.size !== 0) {
    for (const item of pending.values()) {
      if (!gain_root(ns, item)) { continue; }
      done.add(item)
      pending.delete(item)
    }

    for (const item of get_servers(ns)){
      if (pending.has(item) || done.has(item)) {
        continue
      }
      pending.add(item)
    }

    await ns.sleep(1000)
  }
}
