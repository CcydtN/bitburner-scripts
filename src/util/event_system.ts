import type { NS, NetscriptPort } from "@ns";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type Args = any[]
export type Handler = (sys:EventSystem, ...args:Args)=>Promise<void>
export type Condition = (ns:NS) => Promise<boolean>
export type Message = {msg: number;args: Args;};

export class EventSystem {
  public ns:NS
  private msg_queue: Message[]
  private event_table:Map<number, Handler[]>
  private ports:NetscriptPort[]
  private triggers: Map<Condition, Message>
  private oneshot_triggers: Map<Condition, Message>
  // pid management
  private process_ids:Map<number, Handler[]>

  constructor(ns: NS, ...ports: NetscriptPort[]) {
    this.ns = ns
    this.msg_queue = []
    this.event_table = new Map()
    this.ports = ports
    this.triggers = new Map()
    this.oneshot_triggers = new Map()
    this.process_ids = new Map()

    ns.atExit(()=>{
      for (const pid of this.process_ids.keys()) { ns.kill(pid) }
    })
  }

  async loop(sleep_ms: number) {
    while (true) {
      this.receive_from_port()
      await this.check_trigger()
      await this.consume_queue()
      await this.ns.sleep(sleep_ms)
    }
  }

  register(event_id:number, handler: Handler) :boolean {
    if (! this.event_table.has(event_id)) {
      this.event_table.set(event_id, [])
    }
    const entry = this.event_table.get(event_id)
    entry?.push(handler)
    return true
  }

  trigger_on(condition: Condition, msg: Message, oneshot = true) :boolean {
    if (oneshot) {
      this.oneshot_triggers.set(condition, msg)
      return true
    }
    this.triggers.set(condition, msg)
    return true
  }

  // Function that suppose to be called
  send_msg(msg:number, ...args:Args){
    this.msg_queue.push({msg:msg, args:args})
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
  }

  private async message_handler(msg:number, args:Args){
    const entry = this.event_table.get(msg)
    if (entry === undefined) {
      this.ns.print("Undefind event number, %d", msg)
      return
    }
    for (const func of entry){
      await func(this, ...args)
    }
  }

  private async check_trigger() {
    for (const [condition, msg] of this.triggers.entries()){
      if (! await condition(this.ns)) { continue }
      this.msg_queue.push(msg)
    }
    for (const [condition, msg] of this.oneshot_triggers.entries()){
      if (! await condition(this.ns)) { continue }
      this.msg_queue.push(msg)
      this.oneshot_triggers.delete(condition)
    }
  }

  // subprocess management
  manage_subprocess(pid:number, ...hooks:Handler[]) {
    if (!this.process_ids.has(pid)){
      this.process_ids.set(pid, [])
    }
    const entry = this.process_ids.get(pid)
    entry?.push(...hooks)
    return true
  }

  private async subprocess_exit_hook() {
    for (const [pid, vec] of this.process_ids.entries()){
      if (!this.ns.isRunning(pid)) { continue }
      this.process_ids.delete(pid)
      for (const func of vec){ await func(this) }
    }
  }
}
