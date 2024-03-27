import type { NS } from '@ns';
import { type Table, get_server_tree, get_servers_parent } from './util/get_servers';
import { run_command } from './util/run_command';

const facServers:{[server:string]:boolean} = {
    CSEC: true,
    "avmnite-02h": true,
    "I.I.I.I": true,
    run4theh111z: true,
    w0r1d_d43m0n: true
};
// Custom color coding.
const cyan = "\u001b[36m";
const green = "\u001b[32m";
const red = "\u001b[31m";
const reset = "\u001b[0m";

function printDir(ns: NS, current:string, childrenTable:Table, prefix = "") {
    const label_color = facServers[current] ? green : red;
    const text_color = ns.hasRootAccess(current) ? cyan : reset;
    ns.tprint(`${prefix}${label_color}■ ${text_color}${current}`);
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    const  children = childrenTable.get(current)!;
    const len = children.length;
    if (prefix.length > 0) {
        prefix = prefix.slice(0, -1).concat(prefix.slice(-1)[0] == "┣" ? "┃" : " ");
    }
    children.forEach((child, idx) => {
        const next_prefix = prefix.concat(idx !== len - 1 ? "┣" : "┗");
        printDir(ns, child, childrenTable, next_prefix);
    });
}

function build_path(start:string, end:string, parents:Map<string,string>): string[]{
    const paths: string[] = [end]
    let last = end
    while (last !== start) {
        const parent = parents.get(last)
        if (parent === "" || parent === undefined) {return []}
        last = parent
        paths.push(parent);
    }
    return paths
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export  function autocomplete(data:any, args:any) {
    return data.servers;
}

export async function main(ns:NS) {
    // ns.disableLog("ALL");
    ns.disableLog("scan")
    ns.clearLog();
    const childrenTable = get_server_tree(ns);

    if (ns.args.length === 0) {
        printDir(ns, 'home', childrenTable);
        return
    }

    if (ns.args.length !== 1) {
        ns.print("")
    }

    const target : string = ns.args[0].toString().trim();
    const parents = get_servers_parent(ns)
    await ns.sleep(1)
    const path = build_path('home', target, parents)
    if (path.length === 0) {
        ns.tprint(`No path can be found, choices: ${target}`);
        ns.exit();
    }
    const command = path
        .reverse()
        .map((node:string) => `connect ${node}`)
        .join(";");
    ns.print(command)
    run_command(command);
}
