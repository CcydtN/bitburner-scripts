import type { NS, NetscriptPort } from "@ns";

export const on_boot = async()=>true
export const always= async()=>true

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type Args = any[]
export type Handler = (sys:EventSystem, ...args:Args)=>Promise<void>|void
export type Condition = (ns:NS) => Promise<boolean>|boolean
export type Message = {msg: number;args: Args;};

export function create_msg(msg:number, ...args:Args):Message{
  return {msg, args}
}

export class EventSystem {
  public ns:NS
  private msg_queue: Message[]
  private next_queue: Message[]
  private event_table:Map<number, Handler[]>
  private ports:NetscriptPort[]
  private triggers: Map<Condition, Message[]>
  private oneshot_triggers: Map<Condition, Message[]>
  // pid management
  private process_ids:Map<number, Handler[]>
  private debug = false

  constructor(ns: NS, ...ports: NetscriptPort[]) {
    this.ns = ns
    this.msg_queue = []
    this.next_queue = []
    this.event_table = new Map()
    this.ports = ports
    this.triggers = new Map()
    this.oneshot_triggers = new Map()
    this.process_ids = new Map()
    this.event_table.set(-1, [])

    ns.atExit(()=>{
      this.ns.printf("Termating...")
      for (const pid of this.process_ids.keys()) {
        this.ns.printf("killing pid, %d", pid)
        this.ns.kill(pid)
      }

      const entry = this.event_table.get(-1)
      if (entry === undefined) { throw "Should not happen" }
      for (const func of entry) { func(this) }
    })
  }

  set_debug(){this.debug = true}
  reset_debug(){this.debug = false}

  async loop(sleep_ms: number) {
    while (true) {
      this.receive_from_port()
      await this.check_trigger()
      await this.consume_queue()

      await this.subprocess_exit_hook()

      await this.ns.sleep(sleep_ms)
    }
  }

  register(event_id:number, handler: Handler) :boolean {
    if (event_id < 0) {return false}
    if (! this.event_table.has(event_id)) {
      this.event_table.set(event_id, [])
    }
    const entry = this.event_table.get(event_id)
    entry?.push(handler)
    return true
  }

  trigger_on(condition: Condition, msg: Message) :boolean {
    if (! this.triggers.has(condition)) {
      this.triggers.set(condition, [])
    }
    const entry = this.triggers.get(condition)
    entry?.push(msg)
    return true
  }

  trigger_once(condition: Condition, msg: Message) :boolean {
    if (! this.oneshot_triggers.has(condition)) {
      this.oneshot_triggers.set(condition, [])
    }
    const entry = this.oneshot_triggers.get(condition)
    entry?.push(msg)
      return true
  }

  // Function that suppose to be called
  send_msg(msg:number, ...args:Args){
    this.next_queue.push({msg:msg, args:args})
  }

  // Others
  private receive_from_port() {
    for (const port of this.ports){
      while (true) {
        const data = port.read()
        if (data === "NULL PORT DATA") {break}
        this.msg_queue.push(data as Message)
      }
    }
  }

  private async consume_queue() {
    while (true) {
      const item = this.msg_queue.shift()
      if (item === undefined) { break}
      await this.message_handler(item.msg, item.args)
    }
    this.msg_queue = this.next_queue
    this.next_queue = []
  }

  private async message_handler(msg:number, args:Args){
    const entry = this.event_table.get(msg)
    if (entry === undefined) {
      this.ns.printf("Undefind event number, %d", msg)
      return
    }
    for (const func of entry){
      await func(this, ...args)
    }
  }

  private async check_trigger() {
    for (const [condition, msgs] of this.triggers.entries()){
      if (! await condition(this.ns)) { continue }
      this.msg_queue.push(...msgs)
    }
    for (const [condition, msgs] of this.oneshot_triggers.entries()){
      if (! await condition(this.ns)) { continue }
      this.msg_queue.push(...msgs)
      this.oneshot_triggers.delete(condition)
    }
  }

  // subprocess management
  manage_subprocess(pid:number, ...hooks:Handler[]) {
    if(this.debug){this.ns.printf("Managing subprocess pid, %d", pid)}
    if (!this.process_ids.has(pid)){
      this.process_ids.set(pid, [])
    }
    const entry = this.process_ids.get(pid)
    entry?.push(...hooks)
    return true
  }

  private async subprocess_exit_hook() {
    for (const [pid, vec] of this.process_ids.entries()){
      if (this.ns.isRunning(pid)) {continue }
      if (this.debug){this.ns.printf("pid %d exit", pid)}
      this.process_ids.delete(pid)
      for (const func of vec){ await func(this) }
    }
  }

  on_exit(handler:Handler){
    this.event_table.get(-1)?.push(handler)
  }
}
