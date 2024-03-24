import type { NS } from "@ns";
import { force_dispatch } from "util/dispatcher";
import { get_servers_available } from "/util/get_servers";

// loop forever {
//     if security is not minimum {
//         determine how many threads we need to lower security to the minimum
//         find available ram for those threads
//         copy the weaken script to the server(s) with RAM
//         launch the weaken script(s)
//         sleep until weaken is finished
//     } else if money is not maximum {
//         do the same thing, but with the grow script
//     } else {
//         do the same thing, but with the hack script
//     }
// }

let process_id :number[]= []
const queue:(()=>void)[] = []

export async function main(ns: NS): Promise<void> {
  ns.disableLog('scan')
  ns.disableLog('getServerMaxRam')
  ns.disableLog('getServerUsedRam')

  const scripts = ["./weaken.js", "./grow.js", "./hack.js"]
  ns.atExit(()=>{for (const pid of process_id){ns.kill(pid)}})

  const on_going = new Set()

  while (true) {
    const canadates = get_servers_available(ns)
    for (const candate of canadates){
      if (on_going.has(candate)) { continue; }

      ns.scp(scripts, candate,"home")
      const min_level = ns.getServerMinSecurityLevel(candate)
      const max_money= ns.getServerMaxMoney(candate)
      if (max_money !== 0){
        task(ns, candate, min_level, max_money)
      }
      on_going.add(candate)
    }

    while (true) {
      const item = queue.shift()
      if (item === undefined){break;}
      item()
    }
    process_id = process_id.filter(val=> ns.isRunning(val))

    await ns.sleep(1000)
  }
}

function task(ns: NS, target: string, min_level:number, max_money:number) {
  let pid = 0
  let idle = 1000
  if (ns.getServerSecurityLevel(target) !== min_level) {
      const script = "./weaken.js";
      const diff = ns.getServerSecurityLevel(target) - min_level;
      const thread = Math.ceil(diff / ns.weakenAnalyze(1));

      idle = ns.getWeakenTime(target);
      pid = force_dispatch(ns, script, thread, target).pid;
  } else if (ns.getServerMaxMoney(target) !== max_money) {
      const script = "./grow.js";
      const multipler = max_money / ns.getServerMoneyAvailable(target);
      const thread = Math.ceil(ns.growthAnalyze(target, multipler));

      idle = ns.getGrowTime(target);
      pid = force_dispatch(ns, script, thread, target).pid;
  } else if(ns.getHackingLevel() >= ns.getServerRequiredHackingLevel( target)) {
      const script = "./hack.js";
      const thread = Math.ceil(0.9 / ns.hackAnalyze(target));

      idle = ns.getHackTime(target);
      pid = force_dispatch(ns, script, thread, target).pid;
  }
  process_id.push(pid)
  setTimeout(()=> queue.push(()=>task(ns, target, min_level, max_money)), idle)
}

