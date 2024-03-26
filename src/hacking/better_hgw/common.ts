import type { NS } from "@ns";
import { get_servers_available } from "/util/get_servers";

export const GAP = 50

export enum Message{
  setup,
  pick_strategy, // new ready item or 10 min from last update
  update_target_info, // trigger at msg
  hgw, // trigger every loop
}

export type Info = {  
  target:string,
  profit:number,
  duration:number,
  hack_thread:number,
  grow_thread:number,
  weaken_thread:number,
  hack_time:number,
  grow_time:number,
  weaken_time:number,
}

function compute_grow_threads(ns:NS, target: string, max_money: number, hack_amounts:number[]){
  const multipliers  = hack_amounts.map(amount=>{
    if (amount === 1) {return max_money}
    return 1/(1-amount)
  })
  return multipliers.map(mul=>Math.ceil(ns.growthAnalyze(target, mul)))
}

function compute_weaken_threads(ns:NS, target:string, hack_threads:number[], grow_threads:number[]){
  const security_inc = [...Array(hack_threads.length).keys()].map(
    (idx)=>{
      return ns.getServerSecurityLevel(target)
        + ns.hackAnalyzeSecurity(hack_threads[idx],target)
        + ns.growthAnalyzeSecurity(grow_threads[idx], target)
        - ns.getServerMinSecurityLevel(target)
    }
  )
  
  const weaken_threads = security_inc.map((inc)=>{
    return Math.ceil(inc / 0.05) // by ns.weaken() desc, each thread -0.05
  })
  return weaken_threads
}

export function compute_strategy(ns:NS, target: string): Info | undefined{
  const max_money = ns.getServerMaxMoney(target)

  const hack_amount = ns.hackAnalyze(target)
  if (hack_amount === 0) {return undefined}
  const N = Math.floor(1/hack_amount)
  const hack_threads= [...Array(N).keys()].map(i => i + 1)

  const hack_amounts  = hack_threads.map(thread=>hack_amount*thread)
  const grow_threads = compute_grow_threads(ns, target, max_money, hack_amounts)

  const weaken_threads = compute_weaken_threads(ns, target, hack_threads, grow_threads)

  const hack_chance = ns.hackAnalyzeChance(target)
  const avg_money = hack_amounts.map((amount:number)=> max_money * amount * hack_chance)

  const [hack_ram ,grow_ram, weaken_ram, info_ram] = [
    ns.getScriptRam("./hack.js"), ns.getScriptRam("./grow.js"),
    ns.getScriptRam("./weaken.js"), ns.getScriptRam("./info.js"),
  ]

  const hack_usage = hack_threads.map(val=>val*hack_ram)
  const grow_usage = grow_threads.map(val=>val*grow_ram)
  const weaken_usage = weaken_threads.map(val=>val*weaken_ram)
  const info_usage= info_ram

  const host = get_servers_available(ns)
    .filter(val=>val!=='home')
    .map((name)=>ns.getServerMaxRam(name))
  const max_ram = Math.max(...host)
  const total_ram = host.reduce((sum,cur)=>sum+cur, 0)

  const max_ram_check = [...Array(N).keys()].map(
    (idx)=>{
      return Math.max(hack_usage[idx], grow_usage[idx], weaken_usage[idx], info_usage) < max_ram
    }
  )

  const [hack_time , grow_time, weaken_time] = [
    ns.getHackTime(target), ns.getGrowTime(target), ns.getWeakenTime(target)
  ]
  const duration = Math.max(hack_time, grow_time, weaken_time) + 3*GAP
  const batch_count = Math.ceil(duration / (4 * GAP))
  const batch_usage = [...Array(N).keys()].map((idx)=>{
    return (hack_usage[idx] + grow_usage[idx] + weaken_usage[idx] + info_usage) * batch_count
  })

  const total_ram_check= batch_usage.map((usage)=>{
      return usage < 0.9 * total_ram
  })

  const best = [...Array(N).keys()].findLastIndex((idx)=>{
    return max_ram_check[idx] && total_ram_check[idx]
  })

  if (best === -1){return undefined}
  
  return {
    target: target,
    profit: avg_money[best],
    duration: duration,
    hack_thread: hack_threads[best],
    grow_thread: grow_threads[best],
    weaken_thread: weaken_threads[best],
    hack_time: hack_time,
    grow_time: grow_time,
    weaken_time: weaken_time,
  }
}
