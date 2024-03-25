import type { ScriptArg } from "@ns"
import type { EventSystem } from "/util/event_system"

// biome-ignore lint/style/useEnumInitializers: <explanation>
export  enum Event{
  start_script ,
  buy_server,
  upgrade_server,
  sync_file,
  switch_hgw,
}

export namespace resource{
  // biome-ignore lint/nursery/useAwait: <explanation>
  async function start_script(sys:EventSystem, script:string, ...args:ScriptArg[]){
    sys.ns.printf("Try run script, %s", script)
    const pid = sys.ns.run(script)
    if (pid === 0) {
      sys.ns.printf("%s Fail", script)
      sys.send_msg(Event.start_script, script, ...args)
      return
    }
    sys.manage_subprocess(pid)
  }

  export function register(sys: EventSystem){
    sys.register(Event.start_script, start_script)
  }
}
