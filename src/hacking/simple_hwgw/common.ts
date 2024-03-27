import type { NS } from "@ns";
import { get_servers_available } from "/util/get_servers";

export const INTERVAL = 80

export type Data<T> = {hack: T, grow: T, weaken: T}
export function make_data<T>(hack:T,grow:T,weaken:T) : Data<T>{ return {hack,grow,weaken} }

export const script:Data<string> = make_data( "./hack.js",  "./grow.js",  "./weaken.js")

export type TaskInfo<T>= [T, T, T, T]

export type HWGWInfo = {
  target:string,
  is_formulas: boolean;
  profit:number,
  period: number;
  threads: TaskInfo<number>;
}

// biome-ignore lint/style/useEnumInitializers: <explanation>
export enum Message {
    setup,
    pick_strategy,// new ready item or 10 min from last update
    hwgw,
    print_info
}

function compute_grow_threads(ns:NS, target: string, max_money: number, hack_amounts:number[]){
  const multipliers  = hack_amounts.map(amount=>{
    if (amount === 1) {return max_money}
    return 1/(1-amount)
  })
  return multipliers.map(mul=>Math.ceil(ns.growthAnalyze(target, mul)))
}

function compute_weaken_threads(ns:NS, target:string, hack_threads:number[], grow_threads:number[]): Data<number[]>{
  const count = Math.max(...hack_threads, ...grow_threads)

  const weaken_amount = [...Array(count).keys()].map((i) => ns.weakenAnalyze(i+1))
  
  const hack_weaken = hack_threads.map((val)=>{
    return ns.hackAnalyzeSecurity(val, target)
  }).map((val)=> {
    return weaken_amount.findIndex((amount)=> amount >= val) + 1
  })

  const grow_weaken = grow_threads.map((val)=>{
    return ns.growthAnalyzeSecurity(val, target)
  }).map((val)=> {
    return weaken_amount.findIndex((amount)=> amount >= val) + 1
  })
  
  return make_data(hack_weaken, grow_weaken, [])
}

export function compute_strategy(ns:NS, target: string): HWGWInfo | undefined{
  const max_money = ns.getServerMaxMoney(target)

  const hack_amount = ns.hackAnalyze(target)
  if (hack_amount === 0) {return undefined}
  const N = Math.floor(1/hack_amount)
  const hack_threads= [...Array(N).keys()].map(i => i + 1)

  const hack_amounts  = hack_threads.map(thread=>hack_amount*thread)
  const grow_threads = compute_grow_threads(ns, target, max_money, hack_amounts)

  const weaken_threads = compute_weaken_threads(ns, target, hack_threads, grow_threads)

  const hack_chance = ns.hackAnalyzeChance(target)
  const avg_money = hack_amounts.map((amount)=> max_money * amount * hack_chance)

  const ram: Data<number> = make_data(
    ns.getScriptRam(script.hack),
    ns.getScriptRam(script.grow),
    ns.getScriptRam(script.weaken),
  )

  const hack_usage = hack_threads.map(val=>val*ram.hack)
  const grow_usage = grow_threads.map(val=>val*ram.grow)
  const weaken_usage = make_data(
    weaken_threads.hack.map(val=>val*ram.weaken),
    weaken_threads.grow.map(val => val*ram.weaken),
    []
  )

  const host = get_servers_available(ns)
    .filter(val=>val!=='home')
    .map((name)=>ns.getServerMaxRam(name))

  const max_ram = Math.max(...host)
  const total_ram = host.reduce((sum,cur)=>sum+cur, 0)

  const max_ram_check = [...Array(N).keys()].map(
    (idx)=>{
      return Math.max(hack_usage[idx], grow_usage[idx], weaken_usage.hack[idx], weaken_usage.grow[idx]) <= max_ram
    }
  )

  const time = make_data(
    ns.getHackTime(target),
    ns.getGrowTime(target),
    ns.getWeakenTime(target)
  )

  const period = Math.max(time.hack, time.grow, time.weaken) + 4 * INTERVAL
  const batch_count = Math.ceil(period / (4 * INTERVAL))
  const batch_usage = [...Array(N).keys()].map((idx)=>{
    return (hack_usage[idx] + grow_usage[idx] + weaken_usage.hack[idx] + weaken_usage.grow[idx]) * batch_count
  })

  const total_ram_check= batch_usage.map((usage)=>{
      return usage < 0.90 * total_ram
  })

  const best = [...Array(N).keys()].findLastIndex((idx)=>{
    return max_ram_check[idx] && total_ram_check[idx]
  })

  if (best === -1){return undefined}
  
  return {
    target: target,
    is_formulas: false,
    profit: avg_money[best],
    period: period,
    threads: [hack_threads[best], weaken_threads.hack[best], grow_threads[best], weaken_threads.grow[best]],
  }
}

export function formulas_data(ns:NS, target:string){
  const hacking = ns.formulas.hacking

  const server = ns.getServer()
  server.hackDifficulty = server.minDifficulty
  const player = ns.getPlayer()

  const hack_amount = hacking.hackPercent(server,player)
  const N = Math.floor(1/hack_amount)
  const hack_threads= [...Array(N).keys()].map(i => i + 1)
  const hack_amounts  = hack_threads.map(thread=>hack_amount*thread)

  const grow_threads = []
  for (const amount of hack_amounts){
    if(server.moneyMax === undefined) {throw "moneyMax should not be undefined"}
    server.moneyAvailable = server.moneyMax * (1-amount)
    const tmp = hacking.growThreads(server, player, server.moneyMax);
    grow_threads.push(tmp)
  }

  const hack_chance = hacking.hackChance(server,player)
  const time = make_data(
  hacking.hackTime(server, player),
  hacking.growTime(server, player),
  hacking.weakenTime(server, player),
  )

  return {hack_amounts, hack_threads, grow_threads, hack_chance, time}
}
