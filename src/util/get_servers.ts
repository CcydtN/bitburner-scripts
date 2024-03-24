import type { NS } from '@ns';

export type Table = Map<string,string[]>

function scan(ns:NS, parent:string, server:string, list:Table) {
  const children = ns.scan(server);
  if (list.has(server)){return}
  list.set(server,[])
  for (const child of children) {
      if (parent === child) {
          continue;
      }
      list.get(server)?.push(child);
      scan(ns, server, child, list);
  }
}

function scan_parent(ns:NS, parent:string, server:string, list:Map<string,string>) {
  const children = ns.scan(server);
  if (list.has(server)){return}
  list.set(server,parent)
  for (const child of children) {
      scan_parent(ns, server, child, list);
  }
}

export function get_servers(ns:NS) : string[]{
  const list  :Table = new Map();
  scan(ns, '', 'home', list);
  return [...list.keys()];
}

export function get_server_tree(ns:NS): Table {
  const list  :Table = new Map();
  scan(ns, '', 'home', list);
  return list
}

export function get_servers_parent(ns:NS) : Map<string,string>{
  const list = new Map();
  scan_parent(ns, '', 'home', list);
  return list;
}

export function get_servers_available(ns:NS){
  return get_servers(ns)
    .filter((val)=>ns.hasRootAccess(val))
}

