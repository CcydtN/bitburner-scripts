import type { NS } from "@ns";
import { type EventSystem, create_msg, Condition, always} from "/util/event_system";
import { Event } from "/resource";
import { get_servers } from "/util/get_servers";

const base_ram = 4

export namespace file_sync{
  // check condition

    // handle function
  function sync(sys:EventSystem){
    const local_files = sys.ns.ls('home')
      .filter((val)=> val.endsWith(".js"))

    for (const server of get_servers(sys.ns).filter(val=>val!=='home')) {
      sys.ns.scp(local_files, server, 'home')
      const remove_list = sys.ns.ls(server).filter((val)=>!val.endsWith(".msg"))
        .filter((item)=>item in local_files);
      for (const remote_file of remove_list){
        sys.ns.rm(remote_file, server)
      }
    }
  }

  export function register(sys:EventSystem){
    sys.register(Event.sync_file, sync)
  }

  export function add_trigger(sys:EventSystem){
    sys.trigger_on(always, create_msg(Event.sync_file))
  }
}
