import type { NS } from "@ns";
import { get_servers } from "/util/get_servers";

export type Info = {
  target:string,
  // check:boolean,
  hackThread:number,
  growThread:number,
  weakenThread:number,
  hackTime:number,
  growTime:number,
  weakenTime:number,
}

export const GAP = 50

export function server_check(ns:NS, target:string):boolean {
  const min_level = ns.getServerMinSecurityLevel(target)
  const max_money= ns.getServerMaxMoney(target)
  if (ns.getServerSecurityLevel(target) !== min_level) {
    return false
  }
  if (ns.getServerMaxMoney(target) !== max_money) {
    return false
  }
  return true
}

export function requirement_check(ns:NS, target: string): boolean{
  const host = get_servers(ns)
    // .filter(val=>val!=='home')
    .map(ns.getServerMaxRam)
  const max_ram = Math.max(...host)
  const total_ram = host.reduce((acc,val)=>acc+val, 0)
  const info = get_info(ns, target)
  // only check grow, cause it should take most of the ram
  if (max_ram < ns.getScriptRam("./grow.js") * info.growThread) {
    return false
  }

  let batch_ram = ns.getScriptRam("./grow.js") * info.growThread
  batch_ram += ns.getScriptRam("./weaken.js") * info.weakenThread
  batch_ram += ns.getScriptRam("./hack.js") * info.hackThread
  batch_ram += ns.getScriptRam("./info.js")

  const duration = Math.max(info.growTime, info.hackTime, info.weakenTime) + 3*GAP
  const batch_count = (duration / (4 * GAP))
  if (batch_ram * batch_count < total_ram) {
    return false
  }
  return true
}

export function get_info(ns:NS, target: string): Info {
  const hack_ratio = 0.9
  const hack_amount = ns.hackAnalyze(target)
  const hackThread = Math.ceil(hack_ratio / hack_amount)

  const multiplier = 1/(1-hackThread*hack_amount)
  const growThread = Math.ceil(ns.growthAnalyze(target, multiplier))

  const security_inc = ns.hackAnalyzeSecurity(hackThread,target) + ns.growthAnalyzeSecurity(growThread, target)
  const weakenThread = Math.ceil(security_inc / ns.weakenAnalyze(1))

  return {
    target: target,
    // check: ns.getServerSecurityLevel(target) === ns.getServerMinSecurityLevel(target),
    hackThread: hackThread,
    growThread: growThread,
    weakenThread: weakenThread,
    hackTime: ns.getHackTime(target),
    growTime: ns.getGrowTime(target),
    weakenTime: ns.getWeakenTime(target),
  }
}