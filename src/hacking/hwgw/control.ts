import type { NS } from "@ns";
import { get_servers, get_servers_available } from "/util/get_servers";
import { requirement_check, server_check } from "/hacking/hwgw/common";

const scripts = [
  "./hack.js",
  "./grow.js",
  "./weaken.js",
  "./info.js",
  "./common.js",
  "/util/get_servers.js"
]

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")
  let pending :Map<string,number> = new Map()
  let ready:Map<string,number> = new Map()
  let last = undefined
  const port = ns.getPortHandle(1)

  const hwg_pid= ns.run('./hgw.js', 1)
  ns.atExit(()=>{
    for (const pid of pending.values()) { ns.kill(pid) }
    ns.kill(hwg_pid)
  })

  const scp_done :string[] = []
  while (true) {
    // classify target
    const targets = get_servers(ns)
    for (const target of targets) {
      if (!(target in scp_done)) {
        ns.scp(scripts, target)
        scp_done.push(target)
      }
    }

    for (const target of get_servers_available(ns).filter(val=>ns.getServerMaxMoney(val) !== 0)) {
      if (pending.has(target) || target in ready) { continue }

      if (!server_check(ns, target)) {
        const pid = ns.run('./setup.js', 1, target)
        if (pid !== 0){
          pending.set(target, pid)
        }
      }else if (requirement_check(ns,target)) {
        ready.set(target,ns.getServerMaxMoney(target))
      }
    }

    // check pending and remove it if not
    pending = new Map([...pending.entries()].filter(([target, pid])=>ns.isRunning(pid)))

    const current_level = ns.getHackingLevel()
    ready = new Map([...ready.entries()]
      .filter(val=>  current_level > ns.getServerRequiredHackingLevel(val[0]))
      .sort((a,b)=> a[1] - b[1]))

    const new_target = [...ready.keys()][ready.size-1]
    if ( new_target !== last) {
      port.write(new_target)
      ns.printf("New target: %s", new_target)
      last = new_target
    }

    await ns.sleep(2000)
  }
}
