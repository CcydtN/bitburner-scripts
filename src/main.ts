import type { NS, ScriptArg } from "@ns";
import { type Condition, EventSystem, create_msg, on_boot } from "/util/event_system";
import { Event, resource } from "/resource";
import { server } from "/server/event";
import { file_sync } from "/util/file_sync_event";

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")
  const sys = new EventSystem(ns)
  // sys.on_exit((s)=>{s.ns.run(ns.getScriptName())})

  resource.register(sys)
  server.register(sys)
  file_sync.register(sys)

  server.add_trigger(sys)
  file_sync.add_trigger(sys)
  sys.trigger_once(on_boot, create_msg(Event.start_script, '/util/root_access.js'))
  sys.trigger_once(on_boot, create_msg(Event.start_script, '/hacknet/simple.js'))
  sys.trigger_once(home_ram_check(64), create_msg(Event.start_script, '/contracts/main.js'))

  sys.trigger_once(on_boot, create_msg(Event.start_script, '/hacking/manager/main.js'))

  await sys.loop(1000)
}

function home_ram_check(amount:number) : Condition{
  return (ns:NS)=> ns.getServerMaxRam('home') >= amount
}
