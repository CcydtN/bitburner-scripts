import type { NS } from "@ns";
import { EventSystem, always, create_msg } from "/util/event_system";
import { dispatch } from '/util/dispatcher';
import { get_servers } from "/util/get_servers";
import { Message, GAP, compute_strategy, type Info } from "/hacking/better_hgw/common";

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

function register(sys: EventSystem){
  sys.register(Message.setup, setup)
  sys.register(Message.pick_strategy, pick_strategy)
  sys.register(Message.update_target_info, update_target_info)
  sys.register(Message.hgw, hgw)
}

let current_info: Info| undefined = undefined

let new_item_trigger = false
let last_time = 0
let last_duration = 0
const ready :string[] = []

const cooldown: Map<string, number> = new Map()

// setup server => trigger new item trigger

// no feedback from info
// cause we have the duration
// trigger all batch at once

// wait for the duration
// then go for another target, can not be the same one
// 

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL")
  ns.clearPort(1)
  const port = ns.getPortHandle(1)
  const sys = new EventSystem(ns, port)

  register(sys)
  const targets = get_servers(ns)
    .filter((target)=> ns.getServerMaxMoney(target)!==0)

  for (const target of targets){
    sys.trigger_once(
      (ns)=>server_check(ns, target),
      create_msg(Message.setup, target)
    )
  }

  sys.trigger_on(strategy_check, create_msg(Message.pick_strategy))
  sys.trigger_on(always, create_msg(Message.hgw))

  await sys.loop(GAP * 3 + 150)
}

function server_check(ns:NS, target:string){
  return ns.hasRootAccess(target) &&
    ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(target)
}

function strategy_check(ns:NS) {
  return new_item_trigger || (Date.now() - last_time) > (10 * 60 * 1000)
}

function setup(sys:EventSystem, target :string){
  const script = "./setup.js"
  const pid = sys.ns.run(script, 1, target)
  if (pid === 0) {
    sys.send_msg(Message.setup, target)
    return
  }

  sys.manage_subprocess(pid, ()=>{
    // sys.ns.printf("Ready, %s", re)
    ready.push(target)
    new_item_trigger = true
  })
}

function pick_strategy(sys:EventSystem) {
  new_item_trigger = false
  last_time = Date.now()

  for (const [name, timeout] of cooldown.entries()){
    if (Date.now() > timeout) {cooldown.delete(name)}
  }

  const list = ready
    .filter((val) => !(val in cooldown.keys()))
    .map((val)=>{
      if (current_info !== undefined && val === current_info.target) {return current_info}
      return compute_strategy(sys.ns,val)
    })

  let tmp = undefined
  for (const info of list) {
    if (info === undefined) { continue }
    if (tmp === undefined) {tmp = info}
    if (info.profit < tmp.profit) { continue }
    if (info.profit === tmp.profit && info.duration >= tmp.duration) { continue }
    tmp = info
  }

  if (tmp === undefined) { return }
  current_info = tmp
  last_duration = current_info.duration
  cooldown.set(current_info.target, Date.now() + current_info.duration * 1.1)
}

function update_target_info(sys:EventSystem, info:Info) {
  if (current_info === undefined) {throw "Should not happen"}
  if (current_info.target !== info.target){ return }
  current_info = info
  cooldown.set(current_info.target, Date.now() + current_info.duration * 1.1)
}

async function hgw(sys:EventSystem) {
  if (current_info === undefined) {return}
  sys.ns.clearLog()
  sys.ns.printf("-".repeat(3))
  sys.ns.printf("Target: %s", current_info.target)
  sys.ns.printf("Max Profit: %s", current_info.profit)
  sys.ns.printf("Duration: %s", current_info.duration)
  sys.ns.printf("Thread: %d(h), %d(g), %d(w)",
    current_info.hack_thread, current_info.grow_thread, current_info.weaken_thread
  )
  sys.ns.printf("-".repeat(3))

  const tasks = create_tasks(current_info)
  const timing = compute_timing(tasks, GAP)
  const time_diff = Math.max(0, last_duration - timing.duration)
  sys.ns.printf("sleep for %fs", time_diff/1000)
  await sys.ns.sleep(time_diff)
  const result = inorder_dispatch(sys.ns,tasks, timing.delay)
  if (result.length !== 0){ last_duration = timing.duration }
  for (const pid of result){ sys.manage_subprocess(pid) }
}

function create_tasks(info:Info): Task[] {
  return [{
    script: scripts[Action.Hack],
    time: info.hack_time,
    thread: info.hack_thread,
    target: info.target
  },{
    script: scripts[Action.Grow],
    time: info.grow_time,
    thread: info.grow_thread,
    target: info.target
  },{
    script: scripts[Action.Weaken],
    time: info.weaken_time,
    thread: info.weaken_thread,
    target: info.target
  },{
    script: scripts[Action.Info],
    time: 0,
    thread: 1,
    target: info.target
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
    const result = dispatch(ns, script, thread, target, delay[i])
    if (result.pid === 0){
      ns.print("Fail to dispatch, canceling")
      for (const pid of process_id){ ns.kill(pid) }
      return []
    }
    process_id.push(result.pid)
  }
  return process_id
}
