import type { NS, ScriptArg } from "@ns";
import { type Condition, EventSystem, create_msg, on_boot } from "/util/event_system";
import { Event, resource } from "/resource";
import { server } from "/server/event";
import { file_sync } from "/util/file_sync_event";
import { get_servers, get_servers_available } from "./util/get_servers";

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")
  const sys = new EventSystem(ns)
  // sys.on_exit((s)=>{s.ns.run(ns.getScriptName())})
  sys.set_debug()

  resource.register(sys)
  server.register(sys)
  file_sync.register(sys)

  server.add_trigger(sys)
  file_sync.add_trigger(sys)
  sys.trigger_once(on_boot, create_msg(Event.start_script, '/util/root_access.js'))
  sys.trigger_once(on_boot, create_msg(Event.start_script, '/hacknet/simple.js'))
  sys.trigger_once(home_ram_check(64), create_msg(Event.start_script, '/contracts/main.js'))

  sys.trigger_once(on_boot, create_msg(Event.start_script, '/hacking/manager/main.js'))
  sys.trigger_once(total_ram_check(1024), create_msg(Event.switch_script, '/hacking/manager/main.js', '/hacking/simple_hwgw/main.js'))

  await sys.loop(1000)
}

function home_ram_check(ram_amount:number) : Condition{
  return (ns:NS)=> ns.getServerMaxRam('home') >= ram_amount
}

function server_check(ram_amount:number):Condition{
  return (ns:NS)=> {
    const servers = ns.getPurchasedServers()
    if (servers.length < ns.getPurchasedServerLimit()) { return false}
    return ns.getPurchasedServers()
      .map(ns.getServerMaxRam)
      .every(val => val >= ram_amount)
  }
}

function total_ram_check(ram_amount:number) : Condition{
  return (ns:NS)=>{
    return get_servers_available(ns)
      .map((name)=>ns.getServerMaxRam(name))
      .reduce((sum,cur)=>sum+cur, 0) >= ram_amount
  }
}
