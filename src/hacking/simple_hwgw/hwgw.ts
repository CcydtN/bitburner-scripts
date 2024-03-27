import type { NS } from "@ns";
import { EventSystem, always, create_msg } from "/util/event_system";
import { dispatch, dispatch_not_home } from '/util/dispatcher';
import { INTERVAL, type HWGWInfo, Message, type TaskInfo, make_data, script} from "/hacking/simple_hwgw/common";

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")

  if (ns.args.length !== 1) {return}
  const info = JSON.parse(ns.args[0].toString()) as HWGWInfo
  
  const sys = new EventSystem(ns)
  sys.set_debug()

  sys.register(Message.hwgw, hwgw)
  sys.trigger_on(always, create_msg(Message.hwgw, info))

  await sys.loop(INTERVAL * 4)
}

function get_time_data(sys:EventSystem, info:HWGWInfo){
  if (info.is_formulas){
    const server = sys.ns.getServer(info.target)
    server.hackDifficulty = server.minDifficulty
    const player = sys.ns.getPlayer()
    return make_data(
    sys.ns.formulas.hacking.hackTime(server,player),
    sys.ns.formulas.hacking.growTime(server,player),
    sys.ns.formulas.hacking.weakenTime(server,player),
    )
  }
  return make_data(
  sys.ns.getHackTime(info.target),
  sys.ns.getGrowTime(info.target),
  sys.ns.getWeakenTime(info.target)
  )
}

export function hwgw(sys:EventSystem, info: HWGWInfo) {
  const time= make_data(
  sys.ns.getHackTime(info.target),
  sys.ns.getGrowTime(info.target),
  sys.ns.getWeakenTime(info.target)
  )

  const scripts:TaskInfo<string> = [script.hack, script.weaken, script.grow, script.weaken]
  const task_times:TaskInfo<number>= [time.hack, time.weaken, time.grow, time.weaken]
  const delays:TaskInfo<number> = compute_delay(info.period, task_times)

  const result=  execute_batch(
    sys.ns,
    info.target,
    scripts,
    delays,
    info.threads
  )

  for (const pid of result){ sys.manage_subprocess(pid) }
}

function compute_delay(period:number, tasks:number[]) :TaskInfo<number> {
  const count = tasks.length
  const duration  = tasks.map((val, index) => {
    return period - (count- index) * INTERVAL - val
  })
  return duration as TaskInfo<number>
}

function execute_batch(ns :NS, target:string ,scripts:TaskInfo<string>, delays:TaskInfo<number>, threads:TaskInfo<number>): number[]{
  const result = []
  for (let i = 0; i < 4; i++) {
    // const pid = dispatch(ns, scripts[i], threads[i], target, delays[i])
    const pid = dispatch_not_home(ns, scripts[i], threads[i], target, delays[i])
    if (pid === 0) {
      ns.print("Fail to dispatch")
      for (const id of result) {ns.kill(id)}
      return []
     }
    result.push(pid)
  }
  return result
}
