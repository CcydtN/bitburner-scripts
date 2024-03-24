import type { NS } from "@ns";
import { force_dispatch } from "util/dispatcher";

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

export async function main(ns: NS): Promise<void> {
  ns.disableLog('scan')
  ns.disableLog('getServerMaxRam')
  ns.disableLog('getServerUsedRam')

  if (ns.args.length !== 1) {throw "not enought args"}
  const target = ns.args[0].toString()

  let idle = 0
  let pid = 0
  ns.atExit(()=> ns.kill(pid))

  while(true) {
    const min_level = ns.getServerMinSecurityLevel(target)
    const max_money= ns.getServerMaxMoney(target)
    if (ns.getServerSecurityLevel(target) !== min_level) {
        const script = "./weaken.js";
        const diff = ns.getServerSecurityLevel(target) - min_level;
        const thread = Math.ceil(diff / ns.weakenAnalyze(1));

        idle = ns.getWeakenTime(target);
        pid = force_dispatch(ns, script, thread, target, 0).pid;
    } else if (ns.getServerMaxMoney(target) !== max_money) {
        const script = "./grow.js";
        const multipler = max_money / ns.getServerMoneyAvailable(target);
        const thread = Math.ceil(ns.growthAnalyze(target, multipler));

        idle = ns.getGrowTime(target);
        pid = force_dispatch(ns, script, thread, target, 0).pid;
    } else {
      break
    }
    await ns.sleep(idle)
  }
}

