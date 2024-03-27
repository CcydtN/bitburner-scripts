import type { NS } from "@ns";
import { EventSystem, always, create_msg } from "/util/event_system";
import { get_servers } from "/util/get_servers";
import { type HWGWInfo, Message, compute_strategy, INTERVAL} from "/hacking/simple_hwgw/common";
import { hwgw } from "/hacking/simple_hwgw/hwgw"

let last_time = 0
const time_factor = 0.95;

const ready :Set<string> = new Set()
const blacklist: Map<string, number> = new Map()
let current_pick: HWGWInfo|undefined = undefined

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")
  // ns.enableLog('exec')
  const sys = new EventSystem(ns)

  sys.register(Message.setup, setup)
  sys.register(Message.pick_strategy, pick_strategy)
  sys.register(Message.hwgw, hwgw_wrapper)
  sys.register(Message.print_info, print_info)

  const targets = get_servers(ns)
    .filter((target)=> ns.getServerMaxMoney(target)!==0)

  for (const target of targets){
    sys.trigger_once(
      (ns)=>server_check(ns, target),
      create_msg(Message.setup, target)
    )
  }

  sys.trigger_on(strategy_check, create_msg(Message.pick_strategy))
  sys.trigger_on(always, create_msg(Message.hwgw))
  sys.trigger_on(always, create_msg(Message.print_info))

  await sys.loop(INTERVAL * 4)
}

function server_check(ns:NS, target:string){
  return ns.hasRootAccess(target) &&
    ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(target)
}

function strategy_check(ns:NS) {
  return current_pick === undefined || (Date.now() - last_time) > current_pick.period * time_factor
}

function setup(sys:EventSystem, target :string){
  const script = "./setup.js"
  const pid = sys.ns.run(script, 1, target)
  if (pid === 0) {
    sys.send_msg(Message.setup, target)
    return
  }

  sys.manage_subprocess(pid, ()=>{
    ready.add(target)
  })
}

function pick_strategy(sys:EventSystem) {
  for (const [key,val] of blacklist.entries()) {
    if (Date.now() > val) {
      blacklist.delete(key)
      ready.delete(key)
      sys.trigger_once(
        (ns)=>server_check(ns, key),
        create_msg(Message.setup, key)
      )
    }
  }

  const list = [...ready.values()]
    .filter((val) => !blacklist.has(val))
    .map((val)=> compute_strategy(sys.ns,val))

  let pick : (HWGWInfo|undefined)= undefined

  for (const info of list) {
    if (info === undefined) { continue }
    if (pick === undefined) {pick = info; continue }
    if (info.profit < pick.profit) { continue }
    if (info.profit === pick.profit && info.period < pick.period) { continue }
    pick = info
  }

  last_time = Date.now()
  current_pick = pick
}

function hwgw_wrapper(sys:EventSystem){
  if (current_pick===undefined) {
    last_time = 0
    return
  }
  blacklist.set(
    current_pick.target,
    Date.now() + current_pick.period // a little bit more to ensure
  )
  hwgw(sys, current_pick)
}

function print_info(sys:EventSystem) {
  sys.ns.clearLog()
  sys.ns.print("---")
  // sys.ns.printf("Ready list: %s", ready.toString())
  // sys.ns.printf(" ")
  sys.ns.printf("Black list:", )
  for(const item of [...blacklist.keys()]){
    sys.ns.printf("%s", item)
  }
  sys.ns.print("---")
  const now = Date.now()
  const period = current_pick===undefined?0:current_pick.period
  const countdown = (last_time + period * time_factor) - now
  const time_past = now - last_time
  sys.ns.printf("Next pick countdown: %ds", countdown/1000)
  sys.ns.printf("Current pick: %s", current_pick?.target)
  sys.ns.printf("Profit: %s", current_pick?.profit)
  sys.ns.printf("Threads: %s", current_pick?.threads)
  sys.ns.printf("Period: %ds", period/1000)
  sys.ns.printf("Time past: %ds", time_past/1000)
  sys.ns.print("---")
}
