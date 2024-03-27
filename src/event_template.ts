import type { NS, ScriptArg } from "@ns";
import { EventSystem, on_boot } from "/util/event_system";

enum Message{
  start_script = 0
}

function register(sys: EventSystem){
  sys.register(Message.start_script, start_script)
}

export async function main(ns: NS): Promise<void> {
  const sys = new EventSystem(ns)

  register(sys)

  sys.trigger_once(on_boot, {msg:Message.start_script, args:['/util/root_access.js']})
  sys.trigger_once(on_boot, {msg:Message.start_script, args:['/hacking/manger/batcher.js']})

  await sys.loop(1000)
}

function start_script(sys:EventSystem, script:string, ...args:ScriptArg[]){
  const pid = sys.ns.run(script)
  if (pid === 0) {
    sys.send_msg(Message.start_script, script, ...args)
  }else{
    sys.manage_subprocess(pid)
  }
}
