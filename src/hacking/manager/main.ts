import type { NS, ScriptArg } from "@ns";
import { EventSystem, on_boot } from "/util/event_system";
import { get_servers } from "/util/get_servers";
import { force_dispatch } from "/util/dispatcher";

// biome-ignore lint/style/useEnumInitializers: <explanation>
enum  Message{
  weaken,
  grow,
  hack,
}

function register(sys: EventSystem){
  sys.register(Message.weaken, weaken)
  sys.register(Message.grow, grow)
  sys.register(Message.hack, hack)
}

export async function main(ns: NS): Promise<void> {
  ns.disableLog("sleep")
  ns.disableLog("scan")
  ns.disableLog("getServerMaxMoney")
  ns.disableLog("getServerSecurityLevel")
  ns.disableLog("getServerUsedRam")
  ns.disableLog("getServerMaxRam")
  ns.disableLog("getServerMinSecurityLevel")
  ns.disableLog("getServerSecurityLevel")
  ns.disableLog("exec")
  const sys = new EventSystem(ns)
  const pending:Set<string> = new Set()

  register(sys)

  const servers = get_servers(ns)
    .filter(val=>val!=='home')
    .filter(val=>ns.getServerMaxMoney(val)!==0)
  ns.printf("Server count: %d", servers.length)

  for (const server of servers){
    sys.trigger_on(
      (ns)=>weaken_check(ns, server, pending),
      {msg:Message.weaken, args:[server, pending]}
    )
    sys.trigger_on(
      (ns)=>grow_check(ns, server, pending),
      {msg:Message.grow, args:[server, pending]}
    )
    sys.trigger_on(
      (ns)=>hack_check(ns, server, pending),
      {msg:Message.hack, args:[server, pending]}
    )
  }

  await sys.loop(5)
}

function weaken_check(ns:NS, target:string, pending: Set<string>):boolean {
  return ns.hasRootAccess(target) && !pending.has(target) &&
    ns.getServerSecurityLevel(target) !== ns.getServerMinSecurityLevel(target)
}

function grow_check(ns:NS, target:string, pending: Set<string>):boolean{
  return ns.hasRootAccess(target) && !pending.has(target) &&
    ns.getServerSecurityLevel(target) === ns.getServerMinSecurityLevel(target) &&
    ns.getServerMoneyAvailable(target) !== ns.getServerMaxMoney(target)
}

function hack_check(ns:NS, target:string, pending: Set<string>):boolean{
  return ns.hasRootAccess(target) && !pending.has(target) &&
    ns.getServerSecurityLevel(target) === ns.getServerMinSecurityLevel(target) &&
    ns.getServerMoneyAvailable(target) === ns.getServerMaxMoney(target)
}

function weaken(sys:EventSystem, target:string, pending: Set<string>){
  const script = "./weaken.js";
  const min_level = sys.ns.getServerMinSecurityLevel(target)
  const diff = sys.ns.getServerSecurityLevel(target) - min_level;
  const thread = Math.ceil(diff / sys.ns.weakenAnalyze(1));

  const pid = force_dispatch(sys.ns, script, thread, target).pid;
  if (pid === 0) {return}
  pending.add(target)
  sys.manage_subprocess(pid, (sys)=>{pending.delete(target)})
}

function grow(sys:EventSystem, target:string, pending: Set<string>){
  const script = "./grow.js";
  const max_money = sys.ns.getServerMaxMoney(target)
  const multiplier = max_money / sys.ns.getServerMoneyAvailable(target);
  const thread = Math.ceil(sys.ns.growthAnalyze(target, multiplier));

  const pid = force_dispatch(sys.ns, script, thread, target).pid;
  if (pid === 0) {return}
  pending.add(target)
  sys.manage_subprocess(pid, (sys)=>{pending.delete(target)})
}

function hack(sys:EventSystem, target:string, pending: Set<string>) {
  const script = "./hack.js";
  const thread = Math.ceil(0.9 / sys.ns.hackAnalyze(target));

  const pid = force_dispatch(sys.ns, script, thread, target).pid;
  if (pid === 0) {return}
  pending.add(target)
  sys.manage_subprocess(pid, (sys)=>{pending.delete(target)})
}
