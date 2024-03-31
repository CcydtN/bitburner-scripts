import type { NS } from "@ns";
import { force_dispatch } from "util/dispatcher";

export async function main(ns: NS): Promise<void> {
  ns.disableLog('scan')
  ns.disableLog('getServerMaxRam')
  ns.disableLog('getServerUsedRam')

  if (ns.args.length !== 1) {throw "not enough args"}
  const target = ns.args[0].toString()

  let idle = 0
  let pid = 0
  ns.atExit(()=> ns.kill(pid))

  while(true) {
    const min_level = ns.getServerMinSecurityLevel(target)
    const max_money= ns.getServerMaxMoney(target)
    const diff = ns.getServerSecurityLevel(target) - min_level;

    if (ns.getServerSecurityLevel(target) !== min_level) {
        const script = "./weaken.js";
        let thread = 1;
        for (;ns.weakenAnalyze(thread)<=diff; thread+=1)

        idle = ns.getWeakenTime(target);
        pid = force_dispatch(ns, script, thread, target, 0).pid;
    } else if (ns.getServerMaxMoney(target) !== max_money) {
        const script = "./grow.js";
        const multiplier = (max_money / ns.getServerMoneyAvailable(target))||max_money;
        const thread = Math.ceil(ns.growthAnalyze(target, multiplier));

        idle = ns.getGrowTime(target);
        pid = force_dispatch(ns, script, thread, target, 0).pid;
    } else {
      break
    }
    await ns.sleep(idle)
  }
}

