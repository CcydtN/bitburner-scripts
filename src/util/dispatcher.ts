import type { NS, ScriptArg } from "@ns";
import { get_servers_available } from "util/get_servers";

type DispatchResult = {
  pid: number,
  host: string,
  thread: number,
}

type ServerInfo = {
  host:string,
  ram:number,
}

export function get_ram(ns:NS , host:string){
  return ns.getServerMaxRam(host) - ns.getServerUsedRam(host)
}

function get_servers_with_ram(ns:NS) {
  const servers = get_servers_available(ns)
  const infos: ServerInfo[] = servers.map((val)=> { return {host: val, ram:get_ram(ns, val)} })
  return infos.sort((a,b)=> a.ram - b.ram)
}

export function get_best_fit_host(ns:NS, script:string, thread:number){
  const servers = get_servers_with_ram(ns);
  const usage = ns.getScriptRam(script)*thread
  return servers.find((val)=> val.ram > usage)?.host
}

export function get_max_ram(ns:NS) {
  const servers = get_servers_with_ram(ns)
  const result = servers.at(servers.length-1)
  if (result === undefined) {throw "No server available"}
  return result
}

export function force_dispatch(ns:NS, script:string, ideal_thread: number, ...args: ScriptArg[]) : DispatchResult{
  const servers = get_servers_with_ram(ns)
  let server = servers.find((val)=> ns.getScriptRam(script)* ideal_thread <= val.ram)

  let thread = ideal_thread
  if (server === undefined) {
    server = servers[servers.length - 1]
    thread = Math.floor(server.ram / ns.getScriptRam(script))
  }

  const pid = ns.exec(script, server.host, thread, ...args)
  return {pid:pid, host:server.host, thread: thread}
}

export function hgw_dispatch(ns:NS, script:string, thread: number, ...args: ScriptArg[]) : DispatchResult{
  let servers = get_servers_with_ram(ns)
  servers = servers.filter((val)=>val.host!=="home")
  const server = servers.find((val)=> ns.getScriptRam(script)* thread <= val.ram)

  if (server === undefined) { return {pid:0, host:"", thread:1} }

  const pid = ns.exec(script, server.host, thread, ...args)
  return {pid:pid, host:server.host, thread: thread}
}
