import type { NS, NetscriptPort } from '@ns';
import { hgw_dispatch } from '/util/dispatcher';
import { GAP, get_info, type Info } from '/hacking/hgw/common';

enum Action {
  Hack = 0,
  Grow = 1,
  Weaken = 2,
  Info = 3
}

const scripts:string[] = [
  "./hack.js",
  "./grow.js",
  "./weaken.js",
  "./info.js",
]

type Task = {
  script:string,
  time:number,
  thread:number,
  target:string
}

export async function main(ns:NS) {
  ns.disableLog('sleep')
  ns.disableLog('scan')
  ns.disableLog('getServerMaxRam')
  ns.disableLog('getServerUsedRam')
  ns.disableLog('ALL')
  let target = undefined

  // read only, don't write
  const target_port = ns.getPortHandle(1)
  const info_port= ns.getPortHandle(2)

  const temp :number[] = []
  ns.atExit(()=>{for (const pid of temp) {ns.kill(pid)}})


  let on_going:number[] = []
  let info: Info = {} as Info
  ns.atExit(()=>{
    for (const pid of on_going) {ns.kill(pid)}
  })

  let last_duration = 0
  while (true) {
    // Update target
    const new_target = update_from_port<string>(target_port)
    if (new_target!== undefined && new_target !== target){
      target = new_target
      info = get_info(ns, target)
      ns.print("---")
      ns.printf("New target: %s", target)
      ns.print("---")
    }
    if (target === undefined) {
      await ns.sleep(GAP * 2)
      continue
    }

    // Update info
    const new_info = update_from_port<Info>(info_port)
    if (new_info !== undefined && new_info.target === target) {
      info = new_info
      ns.print("---")
      ns.printf("New Info:")
      ns.printf("Hack Time: %f",info.hackTime)
      ns.printf("Grow Time: %f",info.growTime)
      ns.printf("Weaken Time: %f",info.weakenTime)
      ns.print("---")
    }

    // HGW
    const tasks = create_tasks(target, info)
    const {duration, delay} = compute_timing(tasks, GAP)

    // if the hack level upgrade, the duration will be different
    // compute the compensation for that (P.S. duration < last_duration)
    let compensation = Math.max(0, last_duration - duration)
    if (Number.isNaN(compensation)){compensation = 0}
    await ns.sleep(compensation)

    const process_id = inorder_dispatch(ns, tasks, delay)
    on_going = [...on_going.filter(pid=>ns.isRunning(pid)), ...process_id]

    last_duration = duration
    await ns.sleep(GAP * 4)
  }
}

function create_tasks(target:string, info:Info): Task[] {
  return [{
    script: scripts[Action.Hack],
    time: info.hackTime,
    thread: info.hackThread,
    target: target
  },{
    script: scripts[Action.Grow],
    time: info.growTime,
    thread: info.growThread,
    target: target
  },{
    script: scripts[Action.Weaken],
    time: info.weakenTime,
    thread: info.weakenThread,
    target: target
  },{
    script: scripts[Action.Info],
    time: 0,
    thread: 1,
    target: target
  }]
}

function compute_timing(tasks:Task[], gap:number) {
  const count = tasks.length
  const duration :number[]= [...Array(count).keys()]
    .map(x=>(count -1 - x)*gap+tasks[x].time)
  const max_duration = Math.max(...duration)
  const delay = duration.map(x=> max_duration-x)
  return {duration: max_duration, delay}
}

function inorder_dispatch(ns:NS, tasks:Task[], delay: number[]):number[]{
  const count = tasks.length
  const process_id:number[] = []
  for (let i = 0; i < count;i++){
    const {script, thread, target} = tasks[i]
    const result = hgw_dispatch(ns, script, thread, target, delay[i])
    if (result.pid === 0){
      ns.print("Fail to dispatch, canceling")
      for (const pid of process_id){ ns.kill(pid) }
      return []
    }
    process_id.push(result.pid)
  }
  return process_id
}

function update_from_port<Data>(port: NetscriptPort): Data|undefined {
  let new_data = undefined
  while (true) {
    const data = port.read()
    if (data === "NULL PORT DATA") {break}
    new_data = data as Data
  }
  return new_data
}
