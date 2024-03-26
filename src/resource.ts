import type { ScriptArg } from "@ns"
import type { EventSystem } from "/util/event_system"

// biome-ignore lint/style/useEnumInitializers: <explanation>
export  enum Event{
  start_script ,
  switch_script,
  buy_server,
  upgrade_server,
  sync_file,
}

export namespace resource{
  function start_script(sys:EventSystem, script:string){
    sys.ns.printf("Try run script, %s", script)
    const pid = sys.ns.run(script)
    if (pid === 0) {
      sys.ns.printf("Failed, retry...")
      sys.send_msg(Event.start_script, script)
      return
    }
    sys.manage_subprocess(pid)
  }

  function switch_script(sys:EventSystem, old_script:string, new_script:string){
    sys.ns.printf("Try switch script, %s => %s", old_script, new_script)
    const success=sys.ns.kill(old_script, 'home')
    if (success){
      sys.send_msg(Event.start_script, new_script)
    }else{
      sys.ns.printf("Failed, retry...")
      sys.send_msg(Event.switch_script, old_script, new_script)
    }
  }

  export function register(sys: EventSystem){
    sys.register(Event.start_script, start_script)
    sys.register(Event.switch_script, switch_script)
  }
}
